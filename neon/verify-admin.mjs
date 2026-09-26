import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url || !new URL(url).hostname.startsWith("ep-late-voice-b66b813x")) {
  throw new Error("Este teste de escrita só aceita o branch Neon de migração.");
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("BEGIN");
  const email = `migration-check-${randomUUID()}@example.invalid`;
  const { rows: users } = await client.query(
    "INSERT INTO public.users(email,password_hash) VALUES ($1,NULL) RETURNING id", [email]);
  const ownerId = users[0].id;
  const { rows: bars } = await client.query(
    "INSERT INTO public.bars(owner_id,nome,slug) VALUES ($1,$2,$3) RETURNING id",
    [ownerId, "Teste de migração", `teste-${randomUUID()}`]);
  const barId = bars[0].id;
  const { rows: leads } = await client.query(
    "INSERT INTO public.interessados(nome,bar_nome,email,telefone,status,bar_id) VALUES ($1,$2,$3,$4,'convertido',$5) RETURNING id",
    ["Teste", "Teste de migração", email, "11999999999", barId]);
  await client.query("DELETE FROM public.users WHERE id=$1", [ownerId]);
  const after = await client.query("SELECT count(*)::int AS n FROM public.bars WHERE id=$1", [barId]);
  assert.equal(after.rows[0].n, 0, "excluir usuário deve apagar bar");
  const lead = await client.query("SELECT bar_id FROM public.interessados WHERE id=$1", [leads[0].id]);
  assert.equal(lead.rows[0]?.bar_id ?? null, null, "interesse convertido não pode ficar com FK quebrada");
  console.log("OK: provisionamento e cascata administrativa");
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
}
