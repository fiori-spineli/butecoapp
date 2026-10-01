/**
 * Cloudflare Turnstile — o CAPTCHA que não pede pra clicar em semáforo.
 *
 * O servidor valida o token nas actions de login, recuperação e interesse.
 * O widget no navegador oferece a prova, mas nunca autoriza sozinho.
 */

const ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

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

    const dados = (await resposta.json()) as { success?: boolean };
    return dados.success === true;
  } catch {
    return false;
  }
}
