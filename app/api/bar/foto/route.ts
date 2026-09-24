import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SESSAO_INDISPONIVEL, usuarioAtual } from "@/lib/supabase/usuario";
import {
  MENSAGEM_IMAGEM_GRANDE,
  MENSAGEM_IMAGEM_ILEGIVEL,
  PIXELS_MAXIMOS_DA_IMAGEM,
  TAMANHO_MAXIMO_DA_IMAGEM,
} from "@/lib/imagem";

const BUCKET = "produtos-imagens";

/**
 * O caminho da logo antiga dentro do bucket, se — e só se — ela for uma logo
 * DESTE bar gravada por esta rota.
 *
 * É o que autoriza apagar o arquivo anterior. A prova tem de ser positiva
 * (GUARDRAILS.md seção 1): a URL veio do próprio registro do bar, aponta para
 * a pasta dele e tem o nome que só esta rota gera. Qualquer outra coisa — foto
 * de produto, URL antiga de outro formato, valor vazio — fica onde está.
 */
function caminhoDaLogoAntiga(fotoUrl: string | null, barId: string): string | null {
  if (!fotoUrl) return null;
  const marcador = `/storage/v1/object/public/${BUCKET}/`;
  const posicao = fotoUrl.indexOf(marcador);
  if (posicao < 0) return null;
  const caminho = fotoUrl.slice(posicao + marcador.length);
  return new RegExp(`^${barId}/logo_\\d+\\.webp$`).test(caminho) ? caminho : null;
}

/**
 * Logo do bar: recorte quadrado de 400×400 em WebP.
 *
 * Mesmas defesas da foto de produto (app/api/produtos/imagem/route.ts): teto
 * de tamanho antes de ler, teto de pixels no sharp e erro legível quando a
 * imagem não abre. Antes esta rota não tinha nenhum dos três, respondia 500
 * mudo para HEIC ou arquivo corrompido, e cada troca de logo deixava a
 * anterior esquecida no Storage.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { user, indisponivel } = await usuarioAtual(supabase);
  if (indisponivel) return NextResponse.json({ erro: SESSAO_INDISPONIVEL }, { status: 503 });
  if (!user) return NextResponse.json({ erro: "Sua sessão venceu. Entre de novo." }, { status: 401 });

  const { data: bar } = await supabase
    .from("bars")
    .select("id, foto_url")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!bar) return NextResponse.json({ erro: "Bar não encontrado." }, { status: 400 });

  const form = await request.formData();
  const arquivo = form.get("arquivo");

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Escolha uma imagem." }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO_DA_IMAGEM) {
    return NextResponse.json({ erro: MENSAGEM_IMAGEM_GRANDE }, { status: 413 });
  }

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await arquivo.arrayBuffer()), {
      limitInputPixels: PIXELS_MAXIMOS_DA_IMAGEM,
    })
      .rotate() // respeita a orientação EXIF da foto do celular
      .resize(400, 400, { fit: "cover" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ erro: MENSAGEM_IMAGEM_ILEGIVEL }, { status: 422 });
  }

  const caminho = `${bar.id}/logo_${Date.now()}.webp`;

  const { error: uploadErro } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, webp, { contentType: "image/webp", upsert: false });

  if (uploadErro) {
    return NextResponse.json(
      { erro: "O servidor de imagens não respondeu. Tente de novo em alguns segundos." },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

  const { error: erroRegistro } = await supabase
    .from("bars")
    .update({ foto_url: publicUrl })
    .eq("id", bar.id);

  if (erroRegistro) {
    // A logo nova não chegou ao bar: quem sobra órfã é ELA, não a antiga.
    await supabase.storage.from(BUCKET).remove([caminho]);
    return NextResponse.json({ erro: "Não consegui salvar a logo. Tente de novo." }, { status: 500 });
  }

  // Só depois de a nova estar gravada no bar. Falhar aqui não desfaz nada:
  // a antiga vira sobra, que o "Limpar fotos sem produto" do admin recolhe.
  const antiga = caminhoDaLogoAntiga(bar.foto_url, bar.id);
  if (antiga && antiga !== caminho) {
    await supabase.storage.from(BUCKET).remove([antiga]);
  }

  return NextResponse.json({ url: publicUrl });
}
