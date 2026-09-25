import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const resposta = await fetch(`${request.nextUrl.origin}/api/upload/bar/foto`, {
      method: "POST",
      body: formData,
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      return NextResponse.json({ erro: dados.detail || "Erro no upload da logo" }, { status: resposta.status });
    }

    return NextResponse.json({ url: dados.url });
  } catch (error) {
    return NextResponse.json({ erro: "Falha ao enviar logotipo." }, { status: 500 });
  }
}