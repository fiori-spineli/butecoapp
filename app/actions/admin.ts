"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * "Essa pessoa é admin?" — usado só para ROTEAR.
 *
 * Responde a partir da tabela `administradores`, sem exigir o segundo fator.
 * É o que decide se alguém vê a tela do painel (com o cadeado do 2FA na
 * frente) ou é mandado para o /dashboard. Não serve para liberar dado nenhum.
 */
export async function checarSeEhAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("administradores")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(data);
}

/**
 * "Essa pessoa é admin E já digitou o código do segundo fator NESTA sessão?"
 *
 * Esta é a que libera dado e ação. A diferença entre as duas não é detalhe: o
 * painel mostrava a tela do 2FA, mas as server actions atrás dela só conferiam
 * a tabela `administradores`. Quem tivesse a senha do admin — e só a senha —
 * podia chamar cada uma delas direto, por POST, sem passar perto do
 * autenticador. O cadeado trancava a porta e deixava a janela aberta.
 *
 * O banco também passou a exigir `aal2` (migration 0011). São duas camadas de
 * propósito: esta aqui dá mensagem decente para quem está na tela, e a do
 * banco vale mesmo para quem chamar a API por fora do app.
 */
export async function exigirAdminVerificado(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: cargo } = await supabase
    .from("administradores")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cargo) return false;

  const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return nivel?.currentLevel === "aal2";
}

/**
 * Manutenção do banco. A única ação hoje é `analisar`, que recalcula as
 * estatísticas do planejador — ver o comentário da migration 0007 sobre por
 * que a versão anterior (pg_stat_reset) fazia o contrário do que prometia.
 */
export async function dispararManutencao(acao: "analisar") {
  if (!(await exigirAdminVerificado())) {
    return { ok: false, mensagem: "Sessão sem segundo fator. Recarregue o painel e valide o código." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_executar_manutencao", { p_acao: acao });
  if (error) return { ok: false, mensagem: error.message };
  revalidatePath("/admin");
  return { ok: true, mensagem: data as string };
}
