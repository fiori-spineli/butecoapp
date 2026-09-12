import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Quem está logado — separando "não tem sessão" de "não deu para verificar".
 *
 * `supabase.auth.getUser()` faz uma chamada de rede ao servidor de
 * autenticação. O código do app lia só `data.user` e jogava o erro fora, então
 * QUALQUER falha passageira (rede, 5xx do provedor, limite de taxa, timeout)
 * virava `user = null`. Em `lib/bar.ts` isso significava `redirect("/login")`:
 * o dono era expulso no meio do movimento, com a sessão perfeitamente válida,
 * e voltava achando que o app tinha esquecido dele.
 *
 * A distinção é pelo status da resposta:
 *   - 400/401/403 → o servidor respondeu e disse que a sessão não vale. É
 *     deslogado de verdade: pode mandar para o login.
 *   - qualquer outra coisa (5xx, sem status, rede) → NÃO SABEMOS. Quem chama
 *     decide, e a decisão certa nunca é "trate como deslogado".
 *
 * O mesmo princípio da seção 1 do GUARDRAILS.md: leitura que pode vir vazia
 * por acidente não autoriza uma ação destrutiva — e expulsar alguém de uma
 * sessão válida é destrutivo do ponto de vista de quem está trabalhando.
 */
export type SessaoAtual = {
  user: User | null;
  /** true = a verificação falhou; não conclua que a pessoa está deslogada. */
  indisponivel: boolean;
};

export async function usuarioAtual(supabase: SupabaseClient): Promise<SessaoAtual> {
  const { data, error } = await supabase.auth.getUser();

  if (!error) return { user: data.user, indisponivel: false };

  const status = (error as { status?: number }).status ?? 0;
  const sessaoRecusada = status === 400 || status === 401 || status === 403;

  return { user: null, indisponivel: !sessaoRecusada };
}

/** Mensagem única para quando a verificação de sessão não respondeu. */
export const SESSAO_INDISPONIVEL =
  "Não deu para confirmar sua sessão agora. Tente de novo em alguns segundos.";
