import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase/server";

/**
 * Cliente com a chave `service_role`.
 *
 * Essa chave ignora RLS e fala com a API de administração do Auth — é a chave
 * que cria usuário. Ela existe aqui por um motivo só: o cadastro público
 * acabou, e a conta do bar agora nasce no backoffice, feita por nós.
 *
 * Regras de convivência com ela:
 * - Só é importada de arquivos "use server". Nenhum componente cliente a vê.
 * - Não tem prefixo NEXT_PUBLIC_, então o bundler nunca a manda pro navegador.
 * - Toda action que a usa checa `eh_admin` ANTES de montar o cliente. A chave
 *   não é a autorização; ela é só o que executa depois da autorização.
 */

/**
 * Lida a cada chamada, e não uma vez no topo do módulo.
 *
 * Variável de servidor sem prefixo NEXT_PUBLIC_ é resolvida em tempo de
 * execução, mas guardar o valor numa constante de módulo amarra a chave ao
 * primeiro import — o que dá diferença numa plataforma onde o processo pode
 * ser criado antes de a variável existir. Ler na hora é uma linha e tira a
 * dúvida.
 */
function chaveSecreta(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

/**
 * A chave preenchida é mesmo uma chave SECRETA?
 *
 * A tela de API Keys do Supabase tem duas linhas parecidas, e a publicável fica
 * em cima. Colar a errada não dá erro de configuração — dá 401 lá na frente,
 * numa mensagem que manda procurar o problema no lugar errado. Duas formas
 * valem: a nova (`sb_secret_...`) e a antiga, um JWT com role service_role.
 */
function pareceChaveSecreta(chave: string): boolean {
  return chave.startsWith("sb_secret_") || chave.startsWith("eyJ");
}

export function serviceRoleConfigurado(): boolean {
  const chave = chaveSecreta();
  return Boolean(SUPABASE_URL && chave && pareceChaveSecreta(chave));
}

export const AVISO_SEM_SERVICE_ROLE =
  "SUPABASE_SERVICE_ROLE_KEY ausente ou trocada neste ambiente. " +
  "Confira se o valor começa com sb_secret_ — a chave publicável (sb_publishable_) " +
  "fica na linha de cima da mesma tela e não serve aqui.";

export function createSupabaseAdminClient(): SupabaseClient {
  // Cinto de segurança: se algum dia este módulo for importado por engano de
  // um componente cliente, o erro estoura no desenvolvimento em vez de a
  // chave vazar silenciosamente para o bundle.
  if (typeof window !== "undefined") {
    throw new Error("createSupabaseAdminClient só pode ser usado no servidor.");
  }

  if (!serviceRoleConfigurado()) {
    throw new Error(AVISO_SEM_SERVICE_ROLE);
  }

  return createClient(SUPABASE_URL, chaveSecreta(), {
    auth: {
      // Este cliente não representa ninguém logado: não guarda sessão, não
      // renova token e não escreve cookie nenhum.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
