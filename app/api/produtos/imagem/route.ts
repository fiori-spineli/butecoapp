import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "produtos-imagens";
const TAMANHO_MAXIMO = 15 * 1024 * 1024; // 15 MB de entrada

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

  let webp: Buffer;
  try {
    webp = await sharp(Buffer.from(await arquivo.arrayBuffer()))
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
