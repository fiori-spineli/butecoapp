/**
 * Há quanto tempo o segundo fator foi apresentado NESTA sessão.
 *
 * Por que isto existe: a sessão do Supabase não tem expiração absoluta
 * (`auth.sessions.not_after` é nulo) e o nível `aal2`, uma vez conquistado,
 * acompanha a sessão para sempre. Na prática, um admin que digitou o código do
 * autenticador uma vez continuava entrando direto no painel semanas depois, em
 * qualquer aba, só por ter o aparelho. E o painel apaga clientes.
 *
 * O OWASP (Session Management Cheat Sheet) pede timeout de sessão e
 * reautenticação diante de eventos de alto risco. Aqui o meio-termo é uma
 * janela: passou dela, o painel pede o código de novo. Não desloga ninguém,
 * não apaga nada — só recoloca o cadeado.
 *
 * O relógio vem do próprio token: o JWT do Supabase traz `amr`, a lista de
 * métodos de autenticação daquela sessão com o instante de cada um. O método
 * do TOTP é literalmente "totp" (conferido em auth.mfa_amr_claims).
 *
 * FALHA SEGURA, de propósito: qualquer dúvida (sem token, token estranho, sem
 * `amr`, sem `totp`) responde "não vale" — o pior caso é digitar o código uma
 * vez a mais, nunca um admin trancado do lado de fora nem dado exposto.
 */

/** Doze horas: cobre um dia de trabalho sem virar incômodo diário. */
export const JANELA_SEGUNDO_FATOR_MS = 12 * 60 * 60 * 1000;

type EntradaAmr = { method?: string; timestamp?: number };

/** Instante (ms) em que o TOTP foi apresentado nesta sessão, ou null. */
export function instanteDoSegundoFator(accessToken: string | null | undefined): number | null {
  if (!accessToken) return null;

  const partes = accessToken.split(".");
  if (partes.length < 2) return null;

  try {
    const payload = JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8")) as {
      amr?: EntradaAmr[];
    };

    const instantes = (payload.amr ?? [])
      .filter((e) => e.method === "totp" && typeof e.timestamp === "number")
      .map((e) => (e.timestamp as number) * 1000);

    return instantes.length ? Math.max(...instantes) : null;
  } catch {
    return null;
  }
}

/** O segundo fator desta sessão ainda está dentro da janela? */
export function segundoFatorAindaVale(
  accessToken: string | null | undefined,
  agora: number = Date.now(),
): boolean {
  const instante = instanteDoSegundoFator(accessToken);
  if (instante === null) return false;
  return agora - instante <= JANELA_SEGUNDO_FATOR_MS;
}
