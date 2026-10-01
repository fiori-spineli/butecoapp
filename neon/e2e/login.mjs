// Faz login pelo formulário sem JS (progressive enhancement) e imprime o cookie de sessão.
const [,, base, email, senha] = process.argv;
const html = await (await fetch(`${base}/login`)).text();
const form = html.slice(html.indexOf("<form"), html.indexOf("</form>"));
const fd = new FormData();
for (const m of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
  const name = m[0].match(/name="([^"]*)"/)?.[1]; const value = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
  if (name) fd.append(name, value.replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
}
fd.append("email", email); fd.append("password", senha); fd.append("lembrar", "on");
fd.append("cf-turnstile-response", "XXXX.DUMMY.TOKEN.XXXX");
const res = await fetch(`${base}/login`, { method: "POST", body: fd, redirect: "manual" });
const cookie = (res.headers.getSetCookie?.() ?? []).find(c => c.startsWith("buteco_session="));
console.log(JSON.stringify({ status: res.status, location: res.headers.get("location"),
  flags: cookie ? cookie.split(";").slice(1).map(s => s.trim().split("=")[0]).join(",") : null }));
if (cookie) (await import("node:fs")).writeFileSync(process.env.OUT, cookie.split(";")[0]);
