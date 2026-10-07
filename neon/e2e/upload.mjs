// Upload e URL de foto contra o servidor local (R2 falso: domínio fictício, endpoint inalcançável).
// Uso: node neon/e2e/upload.mjs <dir com ca.txt e imagens de teste> (ver run.sh)
//
// Cada caso COMPARA com o esperado e o processo sai com código 1 se algum falhar.
// A versão anterior só imprimia: terminava verde mesmo se "foto de outro bar"
// fosse CRIADA (GUARDRAILS §2 — verificação que não sabe falhar não é verificação).
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const S = process.argv[2], C = readFileSync(`${S}/ca.txt`, "utf8");
const BASE = "http://localhost:3100";
const sql = q => (process.env.TEST_DATABASE_URL
  ? execFileSync("node", ["neon/e2e/sql.mjs", q], { env: { ...process.env, NODE_NO_WARNINGS: "1" } })
  : execFileSync("docker", ["exec", process.env.PG_CONTAINER || "buteco-pg-e2e", "psql", "-U", "postgres", "-d", "buteco", "-Atc", q])
).toString().trim();

let fail = 0;
const ok = (nome, cond, det = "") => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${nome}${det ? `  [${det}]` : ""}`);
};

writeFileSync(`${S}/vetor.svg`, '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');

const up = async (file, type) => {
  const fd = new FormData();
  fd.append("arquivo", new Blob([readFileSync(`${S}/${file}`)], { type }), file);
  const r = await fetch(`${BASE}/api/produtos/imagem`, { method: "POST", body: fd, headers: { Cookie: C, Origin: BASE } });
  return { status: r.status, corpo: await r.text() };
};

// [arquivo, tipo declarado, status esperado, motivo]
for (const [f, t, esperado, porque] of [
  ["vazio.png", "image/png", 400, "arquivo vazio"],
  ["falso.png", "image/png", 400, "texto com extensão .png (assinatura recusa)"],
  ["vetor.svg", "image/png", 400, "SVG nunca chega ao decodificador (librsvg)"],
  ["bomba.png", "image/png", 400, "25 MP acima do teto de 20 MP"],
  // O R2 do teste é inalcançável: imagem válida passa da validação e falha no envio.
  ["ok.png", "image/png", 500, "válida; falha só no bucket falso"],
]) {
  const r = await up(f, t);
  ok(`upload ${f}: ${porque}`, r.status === esperado, `${r.status} ${r.corpo.slice(0, 80)}`);
}

const semOrigem = await fetch(`${BASE}/api/produtos/imagem`, { method: "POST", body: new FormData(), headers: { Cookie: C } });
ok("upload sem Origin: 403", semOrigem.status === 403, String(semOrigem.status));
const semSessao = await fetch(`${BASE}/api/produtos/imagem`, { method: "POST", body: new FormData(), headers: { Origin: BASE } });
ok("upload sem sessão: 401", semSessao.status === 401, String(semSessao.status));

// criarProduto com URL de foto, enviada pelo formulário real (protocolo de Server Action).
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const u = "0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a";
for (const [nome, url, criar] of [
  ["foto de outro bar", `https://img.example.test/produtos/${A}/${u}.webp`, false],
  ["outro domínio", `https://evil.example/produtos/${B}/${u}.webp`, false],
  ["path traversal", `https://img.example.test/produtos/${B}/../${A}/${u}.webp`, false],
  ["traversal codificado", `https://img.example.test/produtos/${B}/%2e%2e/${A}/${u}.webp`, false],
  ["pasta de logos", `https://img.example.test/logos/${B}/${u}.webp`, false],
  ["query string", `https://img.example.test/produtos/${B}/${u}.webp?x=1`, false],
  ["http em vez de https", `http://img.example.test/produtos/${B}/${u}.webp`, false],
  ["URL legítima do próprio bar", `https://img.example.test/produtos/${B}/${u}.webp`, true],
]) {
  const html = await (await fetch(`${BASE}/produtos/novo`, { headers: { Cookie: C } })).text();
  const form = html.slice(html.indexOf("<form"), html.indexOf("</form>"));
  const fd = new FormData();
  for (const x of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const n = x[0].match(/name="([^"]*)"/)?.[1]; const v = x[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (n && n.startsWith("$ACTION")) fd.append(n, v.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  }
  const rotulo = `Teste ${nome}`;
  fd.append("nome", rotulo); fd.append("preco", "10,00"); fd.append("imagem_url", url);
  const r = await fetch(`${BASE}/produtos/novo`, { method: "POST", body: fd, redirect: "manual",
    headers: { Cookie: C, Origin: BASE } });
  const t = await r.text();
  const gravado = sql(`select count(*) from produtos where nome = '${rotulo.replace(/'/g, "''")}'`);
  const recusado = /A foto precisa vir do upload deste bar/.test(t);
  ok(`produto com foto: ${nome}`,
    criar ? gravado === "1" : (gravado === "0" && recusado),
    `status ${r.status}, no banco ${gravado}${recusado ? ", recusado" : ""}`);
}
sql(`delete from produtos where nome like 'Teste %' and bar_id = '${B}'`);

console.log(fail ? `\n${fail} FAIL` : "\nupload: tudo PASS");
process.exitCode = fail ? 1 : 0;
