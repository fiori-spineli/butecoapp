"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
 * Manutenção do banco. A única ação hoje é `analisar`, que recalcula as
 * estatísticas do planejador — ver o comentário da migration 0007 sobre por
 * que a versão anterior (pg_stat_reset) fazia o contrário do que prometia.
 */
export async function dispararManutencao(acao: "analisar") {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_executar_manutencao", { p_acao: acao });
  if (error) return { ok: false, mensagem: error.message };
  revalidatePath("/admin");
  return { ok: true, mensagem: data as string };
}