import { NextResponse } from "next/server";
import { buscarComandaPublica } from "@/lib/neon/queries";

const SEM_CACHE = { "Cache-Control": "private, no-store" } as const;

export async function GET(_request: Request,
  { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const data = await buscarComandaPublica(token);
    return NextResponse.json(data, { headers: SEM_CACHE });
  } catch (error) {
    console.error("[comanda-publica] falha", error);
    return NextResponse.json({ erro: "indisponível" }, { status: 503, headers: SEM_CACHE });
  }
}
