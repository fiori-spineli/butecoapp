import "server-only";

import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { neonPool } from "@/lib/neon-db";
import { getNeonSession } from "@/lib/neon-session";
import { apagarImagem, ImagemInvalida, salvarImagem } from "@/lib/r2";

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

  // Ceiling per bar: one logged-in session could otherwise fill the bucket.
  // 60 an hour is far above a real menu session (pick, crop, retake).
  const { rows: ritmo } = await neonPool.query<{ attempts: number }>(
    `INSERT INTO app_private.auth_rate_limits (key_hash, window_start, attempts)
     VALUES ($1, now(), 1)
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE WHEN auth_rate_limits.window_start < now() - interval '1 hour'
         THEN 1 ELSE auth_rate_limits.attempts + 1 END,
       window_start = CASE WHEN auth_rate_limits.window_start < now() - interval '1 hour'
         THEN now() ELSE auth_rate_limits.window_start END
     RETURNING attempts`, [createHash("sha256").update(`upload:bar:${barId}`).digest()],
  );
  if (ritmo[0].attempts > 60) {
    return NextResponse.json({ erro: "Muitas fotos em pouco tempo. Aguarde alguns minutos." },
      { status: 429 });
  }

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
    if (error instanceof ImagemInvalida) {
      return NextResponse.json({ erro: error.message }, { status: 400 });
    }
    console.error("[upload] falha no R2", error);
    return NextResponse.json({ erro: "Não consegui enviar a imagem." }, { status: 500 });
  }
}
