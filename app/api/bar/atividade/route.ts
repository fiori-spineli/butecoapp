import { NextResponse } from "next/server";
import { getNeonSession } from "@/lib/neon-session";
import { neonPool } from "@/lib/neon-db";
import { assinaturaDoBar } from "@/lib/neon/queries";

const SEM_CACHE = { "Cache-Control": "private, no-store" } as const;

export async function GET() {
  const session = await getNeonSession();
  if (!session) {
    return NextResponse.json({ erro: "sem acesso" }, { status: 401, headers: SEM_CACHE });
  }
  const { rows } = await neonPool.query<{ id: string }>(
    "SELECT id FROM public.bars WHERE owner_id = $1 LIMIT 1", [session.userId],
  );
  if (!rows[0]) {
    return NextResponse.json({ erro: "sem bar" }, { status: 403, headers: SEM_CACHE });
  }
  const assinatura = await assinaturaDoBar(rows[0].id);
  return NextResponse.json({ assinatura }, { headers: SEM_CACHE });
}
