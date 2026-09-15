import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { data: bar } = await supabase
    .from("bars")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!bar) return NextResponse.json({ erro: "Bar não encontrado" }, { status: 400 });

  const form = await request.formData();
  const arquivo = form.get("arquivo");

  if (!(arquivo instanceof File)) {
    return NextResponse.json({ erro: "Arquivo inválido" }, { status: 400 });
  }

  // Converte para WebP 400x400 otimizado
  const webp = await sharp(Buffer.from(await arquivo.arrayBuffer()))
    .rotate()
    .resize(400, 400, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();

  const caminho = `${bar.id}/logo_${Date.now()}.webp`;

  const { error: uploadErro } = await supabase.storage
    .from("produtos-imagens")
    .upload(caminho, webp, { contentType: "image/webp", upsert: true });

  if (uploadErro) {
    return NextResponse.json({ erro: "Erro ao subir imagem" }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from("produtos-imagens").getPublicUrl(caminho);

  await supabase.from("bars").update({ foto_url: publicUrl }).eq("id", bar.id);

  return NextResponse.json({ url: publicUrl });
}