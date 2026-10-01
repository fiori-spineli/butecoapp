"use server";

import { revalidatePath } from "next/cache";
import { exigirBar } from "@/lib/bar";
import { criarPedidoPublico, processarPedido } from "@/lib/neon/pedidos";

export async function enviarPedidoCliente(token: string,
  itens: { produto_id: string; quantidade: number }[]) {
  const result = await criarPedidoPublico(token, itens);
  if (result.ok) revalidatePath(`/c/${token}`);
  return result;
}

export async function confirmarEntrega(pedidoId: string, clienteId: string) {
  const { bar } = await exigirBar();
  const result = await processarPedido(bar.id, pedidoId, clienteId, true);
  if (result.ok) {
    revalidatePath(`/comanda/${clienteId}`);
    revalidatePath("/dashboard");
  }
  return result;
}

export async function recusarPedido(pedidoId: string, clienteId: string) {
  const { bar } = await exigirBar();
  const result = await processarPedido(bar.id, pedidoId, clienteId, false);
  if (result.ok) {
    revalidatePath(`/comanda/${clienteId}`);
    revalidatePath("/dashboard");
  }
  return result;
}
