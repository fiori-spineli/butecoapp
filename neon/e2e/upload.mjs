// Uso: node neon/e2e/upload.mjs <dir com ca.txt e imagens de teste> (ver run.sh)
// Upload e URL de foto contra o servidor local (R2 falso: domínio fictício, endpoint inalcançável).
import { readFileSync } from "node:fs";
const S = process.argv[2], C = readFileSync(`${S}/ca.txt`, "utf8");
const BASE = "http://localhost:3100";
const up = async (file, type) => {
  const fd = new FormData();
  fd.append("arquivo", new Blob([readFileSync(`${S}/${file}`)], { type }), file);
  const r = await fetch(`${BASE}/api/produtos/imagem`, { method: "POST", body: fd, headers: { Cookie: C, Origin: BASE } });
  return `${r.status} ${await r.text()}`;
};
for (const [f, t] of [["vazio.png", "image/png"], ["falso.png", "image/png"], ["bomba.png", "image/png"], ["ok.png", "image/png"]]) {
  console.log(f.padEnd(10), await up(f, t));
}

// criarProduto com URL de foto, FormData como argumento da action (protocolo encodeReply).
const m = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
const id = Object.entries(m).find(([, v]) => v.exportedName === "criarProduto")[0];
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const u = "0a0a0a0a-0a0a-4a0a-8a0a-0a0a0a0a0a0a";
for (const [nome, url] of [
  ["foto de outro bar", `https://img.example.test/produtos/${A}/${u}.webp`],
  ["outro domínio", `https://evil.example/produtos/${B}/${u}.webp`],
  ["path traversal", `https://img.example.test/produtos/${B}/../${A}/${u}.webp`],
  ["traversal codificado", `https://img.example.test/produtos/${B}/%2e%2e/${A}/${u}.webp`],
  ["pasta de logos", `https://img.example.test/logos/${B}/${u}.webp`],
  ["query string", `https://img.example.test/produtos/${B}/${u}.webp?x=1`],
  ["http em vez de https", `http://img.example.test/produtos/${B}/${u}.webp`],
  ["URL legítima do próprio bar", `https://img.example.test/produtos/${B}/${u}.webp`],
]) {
  const html = await (await fetch(`${BASE}/produtos/novo`, { headers: { Cookie: C } })).text();
  const form = html.slice(html.indexOf("<form"), html.indexOf("</form>"));
  const fd = new FormData();
  for (const x of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const n = x[0].match(/name="([^"]*)"/)?.[1]; const v = x[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (n && n.startsWith("$ACTION")) fd.append(n, v.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  }
  fd.append("nome", `Teste ${nome}`); fd.append("preco", "10,00"); fd.append("imagem_url", url);
  const r = await fetch(`${BASE}/produtos/novo`, { method: "POST", body: fd, redirect: "manual",
    headers: { Cookie: C, Origin: BASE } });
  const t = await r.text();
  const l = t.split("\n").find(x => x.startsWith("1:"));
  const red = r.status === 303 ? r.headers.get("location") : null;
  const msg = (t.match(/A foto precisa[^<"]*|Nome do produto[^<"]*|Preço inválido[^<"]*/) || [])[0];
  console.log(nome.padEnd(28), red ? `CRIADO → ${red}` : `${r.status} ${msg || "(sem mensagem)"}`);
}
