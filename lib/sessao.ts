import type { CookieOptions } from "@supabase/ssr";

/**
 * Duração da sessão do dono — o "Manter conectado neste aparelho".
 *
 * O checkbox existia na tela mas ninguém no servidor lia o campo: marcar ou
 * não dava exatamente no mesmo. Agora ele decide a validade dos cookies de
 * sessão, que é o que de fato mantém a pessoa logada entre um dia e outro.
 *
 * Marcado  -> cookie persistente de 30 dias. O refresh token continua válido
 *             e o app renova o acesso sozinho a cada visita.
 * Desmarcado -> cookie de sessão: morre quando o navegador fecha. É o certo
 *             para o celular emprestado ou o computador do caixa.
 */

export const COOKIE_LEMBRAR = "buteco_lembrar";

const TRINTA_DIAS_EM_SEGUNDOS = 60 * 60 * 24 * 30;

export function querSessaoLonga(valorDoCookie: string | undefined): boolean {
  // Padrão marcado: é o que a tela mostra, e é o comportamento que o dono do
  // bar espera do aparelho dele.
  return valorDoCookie !== "0";
}

/**
 * Opções finais de cada cookie de sessão.
 *
 * `httpOnly` é inegociável aqui: nenhum componente cliente lê a sessão, e a
 * mesma origem serve a página pública /c/[token] — deixar o token ao alcance
 * do JavaScript transformaria qualquer XSS futuro em tomada de conta.
 *
 * `secure` vale em produção: o cookie só viaja por HTTPS. Em desenvolvimento
 * o app roda em http://localhost, onde um cookie Secure nem seria gravado.
 * `sameSite: lax` vem do padrão do @supabase/ssr e fica.
 */
export function opcoesDeCookieDeSessao(
  opcoesOriginais: CookieOptions,
  sessaoLonga: boolean,
): CookieOptions {
  const opcoes: CookieOptions = {
    ...opcoesOriginais,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  if (sessaoLonga) {
    opcoes.maxAge = TRINTA_DIAS_EM_SEGUNDOS;
  } else {
    // Sem maxAge e sem expires o navegador trata como cookie de sessão.
    delete opcoes.maxAge;
    delete opcoes.expires;
  }

  return opcoes;
}
