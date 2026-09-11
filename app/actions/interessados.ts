"use server";

import { revalidatePath } from "next/cache";
import { exigirAdminVerificado } from "@/app/actions/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serviceRoleConfigurado } from "@/lib/supabase/admin";
import { criarClienteDoPedido } from "@/app/actions/clientes";
import type { EstadoForm } from "@/app/actions/auth";
import type { Interessado } from "@/lib/types";

/**
 * O backoffice: é aqui, e só aqui, que um bar novo passa a existir.
 *
 * Toda função deste arquivo começa conferindo se quem chamou é admin **com o
 * segundo fator já validado nesta sessão**. A chave `service_role` que vem
 * depois ignora RLS por completo — ela é o que executa, nunca o que autoriza.
 * Sem essa checagem no topo, uma server action é uma URL pública como outra
 * qualquer, e quem tivesse só a senha do admin criaria contas à vontade.
 */
async function exigirAdmin(): Promise<boolean> {
  return exigirAdminVerificado();
}

const NEGADO: EstadoForm = {
  ok: false,
  mensagem: "Acesso negado. Recarregue o painel e valide o código do segundo fator.",
};

/** A fila, do mais novo para o mais velho, com os pendentes na frente. */
export async function listarInteressados(): Promise<Interessado[]> {
  if (!(await exigirAdmin())) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("interessados")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []) as Interessado[];
}

/**
 * Cria a conta do bar a partir de um pedido da fila.
 *
 * A criação em si mora em app/actions/clientes.ts, compartilhada com o cadastro
 * direto do painel. Duas cópias da mesma rotina de provisionar seriam dois
 * lugares para esquecer de corrigir.
 */
export async function criarContaDoBar(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdmin())) return NEGADO;

  if (!serviceRoleConfigurado()) {
    return {
      ok: false,
      mensagem:
        "SUPABASE_SERVICE_ROLE_KEY não está definida neste ambiente. Sem ela não dá para criar contas.",
    };
  }

  const interessadoId = String(formData.get("interessado_id") ?? "").trim();
  const nomeDoBar = String(formData.get("bar_nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!interessadoId || !nomeDoBar || !email) {
    return { ok: false, mensagem: "Faltou o nome do bar ou o e-mail." };
  }

  return criarClienteDoPedido(interessadoId, nomeDoBar, email);
}

/** Marca o pedido como contatado ou descartado, com uma nota do que foi conversado. */
export async function mudarStatusInteressado(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdmin())) return NEGADO;

  const id = String(formData.get("interessado_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!id || !["novo", "contatado", "descartado"].includes(status)) {
    return { ok: false, mensagem: "Situação inválida." };
  }

  // Sem service_role aqui de propósito: a policy da migration 0010 já deixa o
  // admin atualizar a tabela com a própria sessão. Chave que ignora RLS só
  // entra onde o RLS realmente atrapalha.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("interessados")
    .update({
      status,
      observacao: observacao || null,
      atendido_em: status === "novo" ? null : new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, mensagem: "Não consegui salvar a mudança." };

  revalidatePath("/admin");
  return { ok: true, mensagem: "Pedido atualizado." };
}
