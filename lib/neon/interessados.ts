import "server-only";

import { neonPool } from "@/lib/neon-db";
import type { Interessado } from "@/lib/types";

export type NovoInteresse = {
  nome: string; barNome: string; email: string; telefone: string;
  cidade: string | null; mensagem: string | null; ipHash: string | null;
};

export async function registrarInteresseNoNeon(input: NovoInteresse):
  Promise<"ok" | "limite" | "duplicado"> {
  const client = await neonPool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    // Lock both dimensions in a fixed order: concurrent requests from different
    // IPs with the same email must not create duplicate leads.
    const locks = [...new Set([`email:${input.email}`,
      ...(input.ipHash ? [`ip:${input.ipHash}`] : [])])].sort();
    for (const key of locks) {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    }
    if (input.ipHash) {
      const count = await client.query<{ n: string }>(
        `SELECT count(*) AS n FROM public.interessados
         WHERE ip_hash = $1 AND created_at > now() - interval '24 hours'`, [input.ipHash],
      );
      if (Number(count.rows[0].n) >= 3) return "limite";
    }
    const duplicate = await client.query(
      `SELECT 1 FROM public.interessados WHERE email = $1
       AND created_at > now() - interval '24 hours' LIMIT 1`, [input.email],
    );
    if (duplicate.rowCount) return "duplicado";
    await client.query(
      `INSERT INTO public.interessados
       (nome, bar_nome, email, telefone, cidade, mensagem, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [input.nome, input.barNome, input.email, input.telefone,
        input.cidade, input.mensagem, input.ipHash],
    );
    await client.query("COMMIT");
    committed = true;
    return "ok";
  } catch (error) {
    throw error;
  } finally {
    if (!committed) await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
}

export async function listarInteressadosNoNeon(): Promise<Interessado[]> {
  const { rows } = await neonPool.query<Interessado>(
    `SELECT id, nome, bar_nome, email, telefone, cidade, mensagem,
            status, observacao, atendido_em, bar_id, created_at
       FROM public.interessados ORDER BY created_at DESC LIMIT 200`,
  );
  return rows;
}

export async function mudarStatusInteresse(id: string, status: string, observacao: string) {
  const { rowCount } = await neonPool.query(
    `UPDATE public.interessados SET status = $1, observacao = $2,
            atendido_em = CASE WHEN $1 = 'novo' THEN NULL ELSE now() END
      WHERE id = $3 AND status <> 'convertido'`, [status, observacao || null, id],
  );
  return !!rowCount;
}
