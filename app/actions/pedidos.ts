"use server";

import { revalidatePath } from "next/cache";
import { exigirBar } from "@/lib/bar";
import { createSupabaseAnonClient } from "@/lib/supabase/publico";

export async function enviarPedidoCliente(
  token: string,
  itens: { produto_id: string; quantidade: number }[]
) {
  if (!token || !itens.length) {
    return { ok: false, mensagem: "Selecione ao menos um produto." };
  }

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc("fazer_pedido_cliente", {
    p_token: token,
    p_itens: itens,
  });

  if (error || !data?.ok) {
    return { ok: false, mensagem: data?.mensagem || "Não foi possível enviar o pedido." };
  }

  revalidatePath(`/c/${token}`);
  return { ok: true, pedidos: data.pedidos };
}

export async function confirmarEntrega(pedidoId: string, clienteId: string) {
  const { supabase } = await exigirBar();

  const { data, error } = await supabase.rpc("confirmar_entrega_pedido", {
    p_pedido_id: pedidoId,
  });

  if (error || !data?.ok) {
    return { ok: false, mensagem: data?.mensagem || "Falha ao confirmar entrega." };
  }

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function recusarPedido(pedidoId: string, clienteId: string) {
  const { supabase } = await exigirBar();

  const { data, error } = await supabase.rpc("recusar_pedido_pendente", {
    p_pedido_id: pedidoId,
  });

  if (error || !data?.ok) {
    return { ok: false, mensagem: data?.mensagem || "Falha ao recusar pedido." };
  }

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}