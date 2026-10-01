// Testes negativos de sessão, MFA e isolamento contra `next start` LOCAL + Postgres local.
// Uso: via neon/e2e/run.sh (precisa do SECRET_KEY local para cunhar tokens de teste).
import { createHmac, createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BASE = "http://localhost:3100";
const manifest = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
const ids = {};
for (const [id, v] of Object.entries(manifest)) ids[`${v.filename}#${v.exportedName}`] = id;
// Local Docker by default; a disposable Neon branch when TEST_DATABASE_URL is set.
const sql = q => (process.env.TEST_DATABASE_URL
  ? execFileSync("node", ["neon/e2e/sql.mjs", q], { env: { ...process.env, NODE_NO_WARNINGS: "1" } })
  : execFileSync("docker", ["exec", process.env.PG_CONTAINER || "buteco-pg-e2e", "psql", "-U", "postgres", "-d", "buteco", "-Atc", q])
).toString().trim();

let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = "") {
  ok ? pass++ : fail++;
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

async function action(file, name, args, cookie) {
  const id = ids[`app/actions/${file}.ts#${name}`];
  if (!id) throw new Error(`action ${name} não encontrada`);
  const page = ["admin", "mfa", "clientes", "interessados"].includes(file) ? "/admin" : "/dashboard";
  const res = await fetch(`${BASE}${page}`, {
    method: "POST", redirect: "manual",
    headers: { "Next-Action": id, "Content-Type": "text/plain;charset=UTF-8", Origin: BASE,
      Accept: "text/x-component", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  const line = text.split("\n").find(l => l.startsWith("1:"));
  let value = null; try { value = line ? JSON.parse(line.slice(2)) : null; } catch { value = line; }
  const set = (res.headers.getSetCookie?.() ?? []).find(c => c.startsWith("buteco_session="));
  return { status: res.status, value, redirect: res.headers.get("x-action-redirect"),
    cookie: set ? set.split(";")[0] : null, raw: text.slice(0, 300) };
}
const atividade = async cookie => (await fetch(`${BASE}/api/bar/atividade`, { headers: cookie ? { Cookie: cookie } : {} })).status;

async function login(email) {
  const html = await (await fetch(`${BASE}/login`)).text();
  const form = html.slice(html.indexOf("<form"), html.indexOf("</form>"));
  const fd = new FormData();
  for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const n = m[0].match(/name="([^"]*)"/)?.[1]; const v = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (n) fd.append(n, v.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  }
  fd.append("email", email); fd.append("password", "Senha-Teste-Local-1"); fd.append("lembrar", "on");
  fd.append("cf-turnstile-response", "XXXX.DUMMY.TOKEN.XXXX");
  const res = await fetch(`${BASE}/login`, { method: "POST", body: fd, redirect: "manual" });
  const c = (res.headers.getSetCookie?.() ?? []).find(x => x.startsWith("buteco_session="));
  return { cookie: c?.split(";")[0], location: res.headers.get("location"), status: res.status };
}

// Helpers that need the local SECRET_KEY to mint tokens (only possible because this is local).
const key = process.env.SECRET_KEY;
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (body, v) => createHmac("sha256", key).update(`buteco:session:${v}:${body}`).digest("base64url");
const pv = h => createHash("sha256").update(h).digest("base64url");
const decode = c => JSON.parse(Buffer.from(c.split("=")[1].split(".")[0], "base64url").toString());
function totp(secretB32, step) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = "";
  for (const ch of secretB32) bits += A.indexOf(ch).toString(2).padStart(5, "0");
  const bytes = Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2)));
  const ctr = Buffer.alloc(8); ctr.writeBigUInt64BE(BigInt(step));
  const d = createHmac("sha1", bytes).update(ctr).digest(); const o = d[d.length - 1] & 15;
  return ((d.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

const A = "11111111-1111-4111-8111-111111111111", ADMIN = "33333333-3333-4333-8333-333333333333";
const B1 = "b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1", A1 = "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1";
const PB = "b0b0b0b0-b0b0-4b0b-8b0b-b0b0b0b0b0b0", LB = "b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2";
const PEDB = "b3b3b3b3-b3b3-4b3b-8b3b-b3b3b3b3b3b3";

// ---------- sessão do dono A ----------
const a = await login("dono-a@example.test");
check("login dono A redireciona ao painel", a.status === 303 && a.location === "/dashboard", a.location);
check("sessão válida acessa /api/bar/atividade", await atividade(a.cookie) === 200);
check("sem cookie: 401", await atividade(null) === 401);

const [body, sig] = a.cookie.split("=")[1].split(".");
check("assinatura forjada: 401", await atividade(`buteco_session=${body}.${sig.slice(0, -2)}AA`) === 401);
const p = decode(a.cookie);
const forjadoAdmin = b64({ ...p, sub: ADMIN });
check("payload trocado para o admin com assinatura antiga: 401",
  await atividade(`buteco_session=${forjadoAdmin}.${sig}`) === 401);
const hashA = sql(`select password_hash from public.users where id='${A}'`);
const v1 = b64({ sub: A, exp: p.exp, passwordVersion: pv(hashA) });
check("formato antigo v1 (sem sid), assinado com a chave certa: 401",
  await atividade(`buteco_session=${v1}.${sign(v1, "v1")}`) === 401);
const semLinha = b64({ ...p, sid: randomUUID() });
check("sid inexistente no servidor, assinatura válida: 401",
  await atividade(`buteco_session=${semLinha}.${sign(semLinha, "v2")}`) === 401);
const fantasma = b64({ ...p, sub: randomUUID() });
check("usuário inexistente, assinatura válida: 401",
  await atividade(`buteco_session=${fantasma}.${sign(fantasma, "v2")}`) === 401);

// ---------- isolamento entre bares (A tentando mexer no B) ----------
const r1 = await action("comandas", "lancarItens", [B1, [{ tipo: "livre", descricao: "x", valor_centavos: 100, quantidade: 1 }]], a.cookie);
check("A lança item na comanda do B: recusado", r1.value?.ok === false, r1.value?.mensagem);
const r2 = await action("comandas", "registrarPagamento", [B1, 100, "pix"], a.cookie);
check("A registra pagamento na comanda do B: recusado", r2.value?.ok === false, r2.value?.mensagem);
const r3 = await action("comandas", "removerLancamento", [B1, LB], a.cookie);
check("A remove lançamento do B: recusado", r3.value?.ok === false, r3.value?.mensagem);
const r3b = await action("comandas", "removerLancamento", [A1, LB], a.cookie);
check("A remove lançamento do B via comanda própria: recusado", r3b.value?.ok === false, r3b.value?.mensagem);
const r4 = await action("comandas", "fecharConta", [B1], a.cookie);
check("A fecha comanda do B: recusado", r4.value?.ok === false, r4.value?.mensagem);
const r5 = await action("comandas", "lancarItens", [A1, [{ tipo: "produto", produto_id: PB, quantidade: 1 }]], a.cookie);
check("A lança produto do B na própria comanda: recusado", r5.value?.ok === false, r5.value?.mensagem);
const r6 = await action("pedidos", "confirmarEntrega", [PEDB, B1], a.cookie);
check("A confirma pedido do B: recusado", r6.value?.ok === false, r6.value?.mensagem);
const r7 = await action("produtos", "ajustarEstoque", [PB, 5], a.cookie);
check("A ajusta estoque do produto do B: recusado", r7.value?.ok === false, r7.value?.mensagem);
const r8 = await action("produtos", "removerProduto", [PB], a.cookie);
check("A remove produto do B: recusado", r8.value?.ok === false, r8.value?.mensagem);
const pag = await fetch(`${BASE}/comanda/${B1}`, { headers: { Cookie: a.cookie } });
const pagTxt = await pag.text();
check("A abre /comanda/<id do B>: sem dados do B", !pagTxt.includes("Mesa B1"), `status ${pag.status}`);
const estado = sql(`select (select count(*) from lancamentos where cliente_id='${B1}')||'/'||(select count(*) from pagamentos where cliente_id='${B1}')||'/'||(select status from clientes where id='${B1}')||'/'||(select estoque_atual from produtos where id='${PB}')||'/'||(select status from pedidos_pendentes where id='${PEDB}')`);
check("dados do B intactos após as tentativas", estado === "1/0/aberta/0/pendente", estado);

// ---------- dono chamando actions de admin direto, sem UI ----------
for (const [file, name, args] of [["admin", "limparFotosOrfas", []], ["admin", "dispararManutencao", ["analisar"]],
  ["clientes", "alternarSuspensao", [null, "x"]], ["mfa", "iniciarCadastroTOTP", [process.env.ADMIN_MFA_ENROLLMENT_KEY]]]) {
  const r = await action(file, name, args, a.cookie);
  check(`dono chama ${name} sem UI: negado`, r.value?.ok === false, r.value?.mensagem);
}

// ---------- logout revoga no servidor ----------
const copia = a.cookie;
const out = await action("auth", "sair", [], a.cookie);
check("logout redireciona a /login", (out.redirect || "").startsWith("/login"), out.redirect);
check("token copiado ANTES do logout, usado DEPOIS: 401", await atividade(copia) === 401);
check("linha da sessão marcada revogada",
  sql(`select count(*) from app_private.sessions where id='${p.sid}' and revoked_at is not null`) === "1");

// ---------- suspensão e troca de senha ----------
const a2 = await login("dono-a@example.test");
sql(`update public.users set suspended_at=now() where id='${A}'`);
check("dono suspenso: 401", await atividade(a2.cookie) === 401);
sql(`update public.users set suspended_at=null where id='${A}'`);
check("controle: reativado sem revogação, sessão volta (por isso a action revoga)", await atividade(a2.cookie) === 200);
sql(`update public.users set password_hash='${hashA.replace(/\$/g, "$")}x' where id='${A}'`);
check("senha alterada no banco: sessão antiga 401", await atividade(a2.cookie) === 401);
sql(`update public.users set password_hash='${hashA}' where id='${A}'`);

// ---------- admin e MFA ----------
const ad = await login("admin@example.test");
check("login admin redireciona a /admin", ad.location === "/admin", ad.location);
const m0 = await action("admin", "dispararManutencao", ["analisar"], ad.cookie);
check("admin sem MFA chama action privilegiada: negado", m0.value?.ok === false, m0.value?.mensagem);
const k1 = await action("mfa", "iniciarCadastroTOTP", ["chave-errada-chave-errada-chave-errada"], ad.cookie);
check("inscrição com chave de ativação errada: recusada", k1.value?.ok === false, k1.value?.mensagem);
const k2 = await action("mfa", "iniciarCadastroTOTP", [process.env.ADMIN_MFA_ENROLLMENT_KEY], ad.cookie);
check("inscrição com chave certa devolve segredo", k2.value?.ok === true && /^[A-Z2-7]{32}$/.test(k2.value?.secret || ""));
const secret = k2.value.secret;
const stepNow = Math.floor(Date.now() / 30000);
const errado = await action("mfa", "confirmarCadastroTOTP", [ADMIN, totp(secret, stepNow + 5)], ad.cookie);
check("código fora da janela (+5 passos): recusado", errado.value?.ok === false);
const ok1 = await action("mfa", "confirmarCadastroTOTP", [ADMIN, totp(secret, stepNow)], ad.cookie);
check("confirmação com código atual: aceita e gira o cookie", ok1.value?.ok === true && !!ok1.cookie && ok1.cookie !== ad.cookie);
check("cookie pré-MFA deixa de valer após a elevação (rotação)",
  (await action("mfa", "verificarStatusMFA", [], ad.cookie)).value?.temFatorAtivo === false);
const m1 = await action("admin", "dispararManutencao", ["analisar"], ok1.cookie);
check("admin com MFA recente: action privilegiada aceita", m1.value?.ok === true, m1.value?.mensagem);
const replay = await action("mfa", "validarCodigoMFA", [ADMIN, totp(secret, stepNow)], ok1.cookie);
check("replay do mesmo código: recusado", replay.value?.ok === false);
const anterior = await action("mfa", "validarCodigoMFA", [ADMIN, totp(secret, stepNow - 1)], ok1.cookie);
check("código do passo anterior ao já usado: recusado", anterior.value?.ok === false);
const proximo = await action("mfa", "validarCodigoMFA", [ADMIN, totp(secret, stepNow + 1)], ok1.cookie);
check("código do passo seguinte (janela ±1): aceito uma vez", proximo.value?.ok === true);
const pAdm = decode(proximo.cookie || ok1.cookie);
const vencido = b64({ ...pAdm, mfaAt: Math.floor(Date.now() / 1000) - 13 * 3600 });
const m2 = await action("admin", "dispararManutencao", ["analisar"], `buteco_session=${vencido}.${sign(vencido, "v2")}`);
check("MFA de 13 h atrás (sessão viva): action privilegiada negada", m2.value?.ok === false, m2.value?.mensagem);
let bloqueado = false;
for (let i = 0; i < 6; i++) await action("mfa", "validarCodigoMFA", [ADMIN, "000000"], proximo.cookie || ok1.cookie);
const aposLimite = await action("mfa", "validarCodigoMFA", [ADMIN, totp(secret, stepNow + 2)], proximo.cookie || ok1.cookie);
bloqueado = aposLimite.value?.ok === false;
check("após 5 tentativas em 15 min, até código certo é recusado", bloqueado);

console.log(results.join("\n"));
console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exitCode = fail ? 1 : 0;
