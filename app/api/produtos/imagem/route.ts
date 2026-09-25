import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Repassa o arquivo diretamente para o seu endpoint FastAPI serverless
    const resposta = await fetch(`${request.nextUrl.origin}/api/upload/produtos/imagem`, {
      method: "POST",
      body: formData,
    });

    const dados = await resposta.json();
    if (!resposta.ok) {
      return NextResponse.json({ erro: dados.detail || "Erro no upload" }, { status: resposta.status });
    }

    return NextResponse.json({ url: dados.url });
  } catch (error) {
    return NextResponse.json({ erro: "Falha de conexão com o servidor de upload." }, { status: 500 });
  }
}