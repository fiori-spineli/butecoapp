import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { neonPool } from "@/lib/neon-db";
import { getNeonSession } from "@/lib/neon-session";
import { apagarImagem, salvarImagem } from "@/lib/r2";

export async function uploadImagem(request: NextRequest, pasta: "produtos" | "logos") {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ erro: "Origem não permitida." }, { status: 403 });
  }
  const session = await getNeonSession();
  if (!session) return NextResponse.json({ erro: "Entre na sua conta." }, { status: 401 });
  const { rows } = await neonPool.query<{ id: string }>(
    "SELECT id FROM public.bars WHERE owner_id = $1 LIMIT 1", [session.userId],
  );
  const barId = rows[0]?.id;
  if (!barId) return NextResponse.json({ erro: "Bar não encontrado." }, { status: 403 });

  try {
    const data = await request.formData();
    const arquivo = data.get("arquivo");
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ erro: "Envie uma imagem." }, { status: 400 });
    }
    const url = await salvarImagem(arquivo, pasta, barId);
    if (pasta === "logos") {
      try {
        const { rows: previous } = await neonPool.query<{ foto_url: string | null }>(
          "SELECT foto_url FROM public.bars WHERE id = $1 AND owner_id = $2",
          [barId, session.userId],
        );
        if (!previous[0]) throw new Error("Bar não encontrado.");
        await neonPool.query(
          "UPDATE public.bars SET foto_url = $1 WHERE id = $2 AND owner_id = $3",
          [url, barId, session.userId],
        );
        await apagarImagem(previous[0].foto_url, pasta, barId).catch(console.error);
      } catch (error) {
        await apagarImagem(url, pasta, barId).catch(console.error);
        throw error;
      }
    }
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && /imagem|Formato/.test(error.message)) {
      return NextResponse.json({ erro: error.message }, { status: 400 });
    }
    console.error("[upload] falha no R2", error);
    return NextResponse.json({ erro: "Não consegui enviar a imagem." }, { status: 500 });
  }
}
