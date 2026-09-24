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

// Cada foto salva no produto apaga a anterior (ver app/actions/produtos.ts),
// então um bar com catálogo normal tem dezenas de arquivos. Quatrocentos só se
// alcança subindo foto sem nunca salvar — e aí é o teto que segura o Storage.
const LIMITE_DE_FOTOS_POR_BAR = 400;

/**
 * Rede de segurança do pipeline de imagem: o navegador já converte para WebP
 * antes de subir, mas aqui a imagem é reprocessada com sharp para garantir que
 * o arquivo gravado no Storage seja SEMPRE .webp, venha de onde vier.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // "Não verifiquei" não é "não autenticado": no primeiro caso a foto é boa e
  // vale tentar de novo; no segundo não há o que tentar. Dizer 401 para os
  // dois mandava o dono procurar problema na imagem.
  const { user, indisponivel } = await usuarioAtual(supabase);
  if (indisponivel) {
    return NextResponse.json({ erro: SESSAO_INDISPONIVEL }, { status: 503 });
  }
  if (!user) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  const { data: bar } = await supabase
    .from("bars")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!bar) {
    return NextResponse.json({ erro: "bar não encontrado" }, { status: 400 });
  }

  const formulario = await request.formData();
  const arquivo = formulario.get("arquivo");

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "arquivo ausente" }, { status: 400 });
  }
  if (arquivo.size > TAMANHO_MAXIMO_DA_IMAGEM) {
    return NextResponse.json(
      { erro: MENSAGEM_IMAGEM_GRANDE },
      { status: 413 },
    );
  }

  // O teto de fotos é higiene, não é controle de segurança — então ele FALHA
  // ABERTO. Na versão anterior um erro ao listar o Storage (uma instabilidade
  // de rede, um timeout) derrubava o upload inteiro com 500, e o dono via
  // "não consegui subir a foto" numa imagem perfeitamente boa; na segunda
  // tentativa funcionava. Contar arquivos nunca pode impedir alguém de
  // trabalhar: se a contagem falha, deixa passar.
  const { data: existentes, error: erroLista } = await supabase.storage
    .from(BUCKET)
    .list(bar.id, { limit: LIMITE_DE_FOTOS_POR_BAR });

  if (!erroLista && (existentes?.length ?? 0) >= LIMITE_DE_FOTOS_POR_BAR) {
    return NextResponse.json(
      { erro: `Este bar já tem ${LIMITE_DE_FOTOS_POR_BAR} fotos guardadas. Apague alguma antes de subir outra.` },
      { status: 429 },
    );
  }

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await arquivo.arrayBuffer()), { limitInputPixels: PIXELS_MAXIMOS_DA_IMAGEM })
      .rotate() // respeita a orientação EXIF da foto do celular
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
  } catch {
    // Formato que o servidor não decodifica (HEIC sem conversão, arquivo
    // corrompido) ou imagem absurdamente grande em pixels.
    return NextResponse.json(
      { erro: MENSAGEM_IMAGEM_ILEGIVEL },
      { status: 422 },
    );
  }

  const caminho = `${bar.id}/${crypto.randomUUID()}.webp`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, webp, { contentType: "image/webp", upsert: false });

  if (erroUpload) {
    return NextResponse.json(
      { erro: "O servidor de imagens não respondeu. Tente de novo em alguns segundos." },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

  return NextResponse.json({ url: publicUrl });
}
