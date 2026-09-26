import assert from "node:assert/strict";
import pg from "pg";

const url = process.env.DATABASE_URL;
const expectedHost = process.env.NEON_EXPECTED_HOST;
if (!url || !expectedHost || new URL(url).hostname !== expectedHost || expectedHost.includes("-pooler")) {
  throw new Error("A verificação exige a conexão direta da branch esperada.");
}

const client = new pg.Client({ connectionString: url });
await client.connect();
await client.query("BEGIN");
let checks = 0;

async function rejects(query, values, code = "23514") {
  await client.query("SAVEPOINT negative_check");
  try {
    await client.query(query, values);
    throw new Error(`A operação deveria falhar: ${query}`);
  } catch (error) {
    if (error.code !== code) throw error;
    checks++;
  } finally {
    await client.query("ROLLBACK TO SAVEPOINT negative_check");
    await client.query("RELEASE SAVEPOINT negative_check");
  }
}

try {
  const email = `neon-verify-${crypto.randomUUID()}@example.test`;
  const user = (await client.query(
    "INSERT INTO public.users(email, password_hash) VALUES ($1, 'test-only') RETURNING id", [email],
  )).rows[0].id;
  const barA = (await client.query(
    "INSERT INTO public.bars(owner_id, nome, slug) VALUES ($1, 'Teste A', $2) RETURNING id",
    [user, `verify-a-${crypto.randomUUID()}`],
  )).rows[0].id;
  const secondUser = (await client.query(
    "INSERT INTO public.users(email, password_hash) VALUES ($1, 'test-only') RETURNING id",
    [`neon-verify-${crypto.randomUUID()}@example.test`],
  )).rows[0].id;
  const barB = (await client.query(
    "INSERT INTO public.bars(owner_id, nome, slug) VALUES ($1, 'Teste B', $2) RETURNING id",
    [secondUser, `verify-b-${crypto.randomUUID()}`],
  )).rows[0].id;
  const cliente = (await client.query(
    "INSERT INTO public.clientes(bar_id, nome) VALUES ($1, 'Mesa teste') RETURNING id", [barA],
  )).rows[0].id;
  const foreignProduct = (await client.query(
    "INSERT INTO public.produtos(bar_id, nome, preco_centavos) VALUES ($1, 'Alheio', 500) RETURNING id", [barB],
  )).rows[0].id;

  await rejects(
    "INSERT INTO public.lancamentos(cliente_id, produto_id, quantidade, valor_unitario_centavos) VALUES ($1, $2, 1, 500)",
    [cliente, foreignProduct],
  );
  const item = (await client.query(
    "INSERT INTO public.lancamentos(cliente_id, descricao, quantidade, valor_unitario_centavos) VALUES ($1, 'Teste', 2, 500) RETURNING id",
    [cliente],
  )).rows[0].id;
  await rejects("UPDATE public.clientes SET status = 'fechada' WHERE id = $1", [cliente]);
  await rejects(
    "INSERT INTO public.pagamentos(cliente_id, valor_centavos) VALUES ($1, 1001)", [cliente],
  );
  await client.query(
    "INSERT INTO public.pagamentos(cliente_id, lancamento_id, quantidade_paga, valor_centavos) VALUES ($1, $2, 1, 500)",
    [cliente, item],
  );
  await rejects(
    "INSERT INTO public.pagamentos(cliente_id, lancamento_id, quantidade_paga, valor_centavos) VALUES ($1, $2, 2, 500)",
    [cliente, item],
  );
  await rejects("DELETE FROM public.lancamentos WHERE id = $1", [item]);
  const resumo = (await client.query(
    "SELECT total_centavos, pago_centavos, restante_centavos FROM public.comandas_resumo WHERE id = $1", [cliente],
  )).rows[0];
  assert.deepEqual(resumo, { total_centavos: "1000", pago_centavos: "500", restante_centavos: "500" });
  checks++;

  await client.query(
    "INSERT INTO public.pagamentos(cliente_id, valor_centavos) VALUES ($1, 500)", [cliente],
  );
  await client.query("UPDATE public.clientes SET status = 'fechada' WHERE id = $1", [cliente]);
  await rejects(
    "INSERT INTO public.lancamentos(cliente_id, descricao, quantidade, valor_unitario_centavos) VALUES ($1, 'Tarde', 1, 500)",
    [cliente],
  );
  console.log(`verified ${checks} money and tenant guards; test transaction rolled back`);
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
