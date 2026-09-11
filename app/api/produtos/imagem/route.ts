import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "produtos-imagens";

// O que chega aqui é o recorte de 800×800 que o editor de foto gera no
// navegador (components/produto/editor-de-foto.tsx) — poucas centenas de KB.
// O teto de 6 MB deixa folga para o JPEG de navegador sem WebP e ainda assim
// corta o envio de arquivo gigante feito por fora da interface.
const TAMANHO_MAXIMO = 6 * 1024 * 1024;

// Bomba de descompressão: um PNG de 1 MB pode abrir em 20.000×20.000 pixels e
// levar 1,6 GB de memória só para decodificar. Trinta megapixels é mais do
// que qualquer câmera de celular comum, e cabe folgado na função.
const PIXELS_MAXIMOS = 30_000_000;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  if (arquivo.size > TAMANHO_MAXIMO) {
    return NextResponse.json({ erro: "imagem muito grande" }, { status: 413 });
  }

  const { data: existentes, error: erroLista } = await supabase.storage
    .from(BUCKET)
    .list(bar.id, { limit: LIMITE_DE_FOTOS_POR_BAR });
  if (erroLista) {
    return NextResponse.json({ erro: "não consegui conferir as fotos do bar" }, { status: 500 });
  }
  if ((existentes?.length ?? 0) >= LIMITE_DE_FOTOS_POR_BAR) {
    return NextResponse.json({ erro: "limite de fotos do bar atingido" }, { status: 429 });
  }

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await arquivo.arrayBuffer()), { limitInputPixels: PIXELS_MAXIMOS })
      .rotate() // respeita a orientação EXIF da foto do celular
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
  } catch {
    return NextResponse.json({ erro: "não consegui processar a imagem" }, { status: 422 });
  }

  const caminho = `${bar.id}/${crypto.randomUUID()}.webp`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, webp, { contentType: "image/webp", upsert: false });

  if (erroUpload) {
    return NextResponse.json({ erro: "não consegui subir a imagem" }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

  return NextResponse.json({ url: publicUrl });
}
