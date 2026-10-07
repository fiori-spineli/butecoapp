// Concorrência e regras de dinheiro pela action real, contra o servidor local.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
// Uso: node neon/e2e/dinheiro.mjs <dir com ca.txt do dono B> (ver run.sh)
const S = process.argv[2];
const BASE = "http://localhost:3100";
const C = readFileSync(`${S}/ca.txt`, "utf8"); // dono B
const m = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
const id = n => Object.entries(m).find(([, v]) => v.exportedName === n)[0];
// Local Docker by default; a disposable Neon branch when TEST_DATABASE_URL is set.
const sql = q => (process.env.TEST_DATABASE_URL
  ? execFileSync("node", ["neon/e2e/sql.mjs", q], { env: { ...process.env, NODE_NO_WARNINGS: "1" } })
  : execFileSync("docker", ["exec", process.env.PG_CONTAINER || "buteco-pg-e2e", "psql", "-U", "postgres", "-d", "buteco", "-Atc", q])
).toString().trim();
const call = async (n, args) => {
  const r = await fetch(`${BASE}/dashboard`, { method: "POST", headers: { "Next-Action": id(n),
    "Content-Type": "text/plain;charset=UTF-8", Origin: BASE, Cookie: C }, body: JSON.stringify(args) });
  const l = (await r.text()).split("\n").find(x => x.startsWith("1:"));
  // An action that redirects answers with a component row, not JSON: callers
  // that care check the database instead.
  try { return l ? JSON.parse(l.slice(2)) : null; } catch { return null; }
};
let fail = 0; const ok = (n, c, d = "") => { if (!c) fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? `  [${d}]` : ""}`); };

const cid = sql(`insert into clientes(bar_id,nome) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Concorrência') returning id`).split("\n")[0];
await call("lancarItens", [cid, [{ tipo: "livre", descricao: "Rodada", valor_centavos: 1000, quantidade: 1 }]]);
// 10 pagamentos simultâneos de R$ 10,00 numa comanda de R$ 10,00: só um pode passar.
const rs = await Promise.all(Array.from({ length: 10 }, () => call("registrarPagamento", [cid, 1000, "pix"])));
const aceitos = rs.filter(r => r?.ok).length;
const pago = sql(`select coalesce(sum(valor_centavos),0) from pagamentos where cliente_id='${cid}'`);
ok("10 pagamentos simultâneos do saldo inteiro: exatamente 1 aceito", aceitos === 1 && pago === "1000", `aceitos=${aceitos} pago=${pago}`);

const cid2 = sql(`insert into clientes(bar_id,nome) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Por item') returning id`).split("\n")[0];
await call("lancarItens", [cid2, [{ tipo: "livre", descricao: "Porção", valor_centavos: 2550, quantidade: 3 }]]);
const lid = sql(`select id from lancamentos where cliente_id='${cid2}'`);
const rs2 = await Promise.all(Array.from({ length: 6 }, () => call("registrarPagamentoDeItem", [cid2, lid, 1, "Ana"])));
const q = sql(`select coalesce(sum(quantidade_paga),0)||'/'||coalesce(sum(valor_centavos),0) from pagamentos where lancamento_id='${lid}'`);
ok("6 pagamentos simultâneos de 1 unidade num item de 3: param em 3", q === "3/7650", `${rs2.filter(r => r?.ok).length} aceitos, ${q}`);
const rem = await call("removerLancamento", [cid2, lid]);
ok("remover item já pago: recusado", rem?.ok === false && sql(`select count(*) from lancamentos where id='${lid}'`) === "1", rem?.mensagem);
const resumo = sql(`select total_centavos||'/'||pago_centavos||'/'||restante_centavos from comandas_resumo where id='${cid2}'`);
ok("comandas_resumo em centavos exatos (3 × 25,50)", resumo === "7650/7650/0", resumo);

const cid3 = sql(`insert into clientes(bar_id,nome) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Pedido pendente') returning id`).split("\n")[0];
sql(`insert into pedidos_pendentes(bar_id,cliente_id,produto_id,quantidade,valor_unitario_centavos) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','${cid3}','b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0',1,1200)`);
const f = await call("fecharConta", [cid3]);
ok("fechar comanda com pedido pendente: recusado", f?.ok === false && sql(`select status from clientes where id='${cid3}'`) === "aberta", f?.mensagem);
const over = await call("registrarPagamento", [cid3, 1, "pix"]);
ok("pagamento acima do saldo (saldo zero): recusado", over?.ok === false, over?.mensagem);
const fechar = await call("fecharConta", [cid]);
const late = await call("lancarItens", [cid, [{ tipo: "livre", descricao: "Tarde", valor_centavos: 500, quantidade: 1 }]]);
ok("lançar em comanda fechada: recusado", fechar?.ok === true && late?.ok === false, late?.mensagem);
// ---------- histórico: a venda guarda o nome com que foi vendida (0006) ----------
const BB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const pid = sql(`insert into produtos(bar_id,nome,preco_centavos) values ('${BB}','Chopp Teste',900) returning id`).split("\n")[0];
const cid4 = sql(`insert into clientes(bar_id,nome) values ('${BB}','Histórico') returning id`).split("\n")[0];
const l4 = await call("lancarItens", [cid4, [{ tipo: "produto", produto_id: pid, quantidade: 2 }]]);
sql(`update produtos set nome='Chopp Renomeado' where id='${pid}'`);
const nomeVenda = sql(`select nome_item from relatorio_vendas_detalhado where comanda_id='${cid4}'`);
ok("renomear produto não reescreve a venda", l4?.ok === true && nomeVenda === "Chopp Teste", nomeVenda);
await call("removerProduto", [pid]);
const depois = sql(`select (select count(*) from produtos where id='${pid}')||'/'||coalesce((select descricao||':'||coalesce(produto_id::text,'null') from lancamentos where cliente_id='${cid4}'),'sumiu')`);
ok("excluir produto mantém a venda com o nome original", depois === "0/Chopp Teste:null", depois);

// ---------- exclusão com pedido pendente é recusada ----------
const pid2 = sql(`insert into produtos(bar_id,nome,preco_centavos) values ('${BB}','Porção Teste',2500) returning id`).split("\n")[0];
const cid5 = sql(`insert into clientes(bar_id,nome) values ('${BB}','Pedido público') returning id`).split("\n")[0];
const token5 = sql(`select token from clientes where id='${cid5}'`);
const pend = sql(`insert into pedidos_pendentes(bar_id,cliente_id,produto_id,quantidade,valor_unitario_centavos) values ('${BB}','${cid5}','${pid2}',1,2500) returning id`).split("\n")[0];
const rp = await call("removerProduto", [pid2]);
ok("excluir produto com pedido pendente: recusado", rp?.ok === false &&
  sql(`select count(*) from produtos where id='${pid2}'`) === "1", rp?.mensagem);

// ---------- pedido público: tudo ou nada ----------
const antes = sql(`select count(*) from pedidos_pendentes where cliente_id='${cid5}'`);
const parcial = await call("enviarPedidoCliente", [token5, [{ produto_id: pid2, quantidade: 1 }, { produto_id: pid2, quantidade: 100 }]]);
ok("pedido com um item inválido: recusado inteiro", parcial?.ok === false &&
  sql(`select count(*) from pedidos_pendentes where cliente_id='${cid5}'`) === antes, parcial?.mensagem);
const inteiro = await call("enviarPedidoCliente", [token5, [{ produto_id: pid2, quantidade: 2 }]]);
ok("pedido válido: aceito e contado", inteiro?.ok === true && inteiro?.pedidos === 1, JSON.stringify(inteiro));

// ---------- recusa chega ao cliente ----------
const rec = await call("recusarPedido", [pend, cid5]);
const publica = await (await fetch(`${BASE}/api/comanda/${token5}`)).json();
const visto = (publica?.pedidos_pendentes ?? []).some(p => p.id === pend && p.status === "cancelado");
ok("pedido recusado aparece para o cliente", rec?.ok === true && visto, `status na API: ${visto}`);

process.exitCode = fail ? 1 : 0;
