import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/server";

/**
 * O login com Google está mesmo ligado no projeto?
 *
 * Vale a pergunta porque a resposta é feita no painel do Supabase, não no
 * código, e o botão precisa acompanhar. Testado com o provider desligado: o
 * Supabase não redireciona de volta com erro — ele responde uma página crua de
 * JSON, `{"error_code":"validation_failed","msg":"Unsupported provider"}`.
 * Quem clicasse veria isso, sem caminho de volta.
 *
 * Amarrar o botão a uma variável de ambiente resolveria, mas cria um segundo
 * lugar para lembrar de mudar. O endpoint `/auth/v1/settings` é público (só
 * pede a chave anônima) e diz a verdade do projeto: ligou no painel, o botão
 * aparece sozinho na próxima renderização.
 *
 * Falha fechada: sem resposta, sem botão. Esconder um caminho que existe é
 * menos ruim do que oferecer um que não funciona.
 */
export async function loginComGoogleDisponivel(): Promise<boolean> {
  if (!supabaseConfigurado()) return false;

  try {
    const resposta = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
      // Configuração de painel não muda de minuto em minuto, e a tela de login
      // é a mais visitada do app.
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });

    if (!resposta.ok) return false;

    const dados = (await resposta.json()) as { external?: Record<string, boolean> };
    return dados.external?.google === true;
  } catch {
    return false;
  }
}
