/**
 * Cloudflare Turnstile — o CAPTCHA que não pede pra clicar em semáforo.
 *
 * O servidor valida o token nas actions de login, recuperação e interesse.
 * O widget no navegador oferece a prova, mas nunca autoriza sozinho.
 */

import { headers } from "next/headers";

const ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** Cloudflare's documented always-pass/always-fail test secrets (1x…, 2x…, 3x…). */
const SEGREDO_DE_TESTE = /^[123]x0+AA$/;

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * Sem chave configurada o app continua funcionando — é o que permite rodar o
 * `next dev` sem conta na Cloudflare. Em produção as duas variáveis PRECISAM
 * estar definidas: sem elas o formulário de interesse fica sem CAPTCHA e
 * sobram só o honeypot e o limite por IP.
 */
export function turnstileConfigurado(): boolean {
  return Boolean(TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Confere o token no servidor da Cloudflare.
 *
 * Falha fechada quando está configurado: token vazio, expirado ou reusado
 * devolve `false`. Falha aberta só quando não há chave nenhuma — ver acima.
 */
export async function conferirTurnstile(
  token: string | null | undefined,
  ipDoVisitante?: string | null,
): Promise<boolean> {
  const segredo = process.env.TURNSTILE_SECRET_KEY;
  if (!segredo || !TURNSTILE_SITE_KEY) return process.env.NODE_ENV !== "production";

  if (!token) return false;

  const corpo = new URLSearchParams({ secret: segredo, response: token });
  if (ipDoVisitante) corpo.set("remoteip", ipDoVisitante);

  try {
    const resposta = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: corpo,
      // O visitante está esperando na tela; se a Cloudflare demorar, é melhor
      // recusar e pedir de novo do que segurar a requisição indefinidamente.
      signal: AbortSignal.timeout(8000),
    });

    const dados = (await resposta.json()) as { success?: boolean; hostname?: string };
    if (dados.success !== true) return false;
    // Cloudflare recommends checking where the token was issued: a token solved
    // on another site that shares the sitekey must not open our login. The
    // public test secrets answer a dummy hostname, so they skip this check.
    if (SEGREDO_DE_TESTE.test(segredo)) return true;
    const cabecalhos = await headers();
    const aceitos = new Set([
      cabecalhos.get("x-forwarded-host"), cabecalhos.get("host"),
      (() => { try { return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host; } catch { return null; } })(),
    ].filter(Boolean).map(h => h!.split(":")[0]));
    if (dados.hostname && aceitos.has(dados.hostname)) return true;
    console.error("[turnstile] token emitido para outro host", dados.hostname);
    return false;
  } catch {
    return false;
  }
}
