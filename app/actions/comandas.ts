"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import type { EstadoForm } from "@/app/actions/auth";
import {
  abrirComanda, adicionarItens, adicionarPagamento, adicionarPagamentoPorItem,
  excluirLancamento, excluirPagamento, encerrarComanda, reabrirComanda,
  repetirLancamento, ComandaErro,
} from "@/lib/neon/comandas";

export type ItemParaLancar =
  | { tipo: "produto"; produto_id: string; quantidade: number }
  | { tipo: "livre"; descricao: string; valor_centavos: number; quantidade: number };

export type Resultado = { ok: boolean; mensagem?: string };

function falha(error: unknown, generica: string): Resultado {
  if (error instanceof ComandaErro) return { ok: false, mensagem: error.message };
  console.error("[comanda] operação recusada", error);
  return { ok: false, mensagem: generica };
}

function atualizar(clienteId: string) {
  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  revalidatePath("/fechamento");
}

export async function criarComanda(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const mesa = String(formData.get("numero_mesa") ?? "").trim();
  if (!nome || nome.length > 80 || mesa.length > 20) {
    return { ok: false, mensagem: "Nome ou número da mesa inválido." };
  }
  const { bar } = await exigirBar();
  let id: string;
  try {
    id = await abrirComanda(bar.id, nome, mesa || null);
  } catch (error) {
    const resultado = falha(error, "Não consegui abrir a comanda.");
    return { ok: false, mensagem: resultado.mensagem || "Não consegui abrir a comanda." };
  }
  atualizar(id);
  redirect(`/comanda/${id}?nova=1`);
}

export async function lancarItens(clienteId: string, itens: ItemParaLancar[]): Promise<Resultado> {
  const { bar } = await exigirBar();
  try {
    await adicionarItens(bar.id, clienteId, itens);
    atualizar(clienteId);
    return { ok: true };
  } catch (error) { return falha(error, "Não consegui lançar os itens."); }
}

export async function removerLancamento(clienteId: string, lancamentoId: string): Promise<Resultado> {
  const { bar } = await exigirBar();
  try {
    await excluirLancamento(bar.id, clienteId, lancamentoId);
    atualizar(clienteId);
    return { ok: true };
  } catch (error) { return falha(error, "Não consegui remover o item."); }
}

export async function registrarPagamento(clienteId: string, valorCentavos: number,
  descricao: string, nomePagador?: string): Promise<Resultado> {
  const { bar } = await exigirBar();
  const final = `${nomePagador?.trim() ? `${nomePagador.trim()} · ` : ""}${descricao.trim()}`.slice(0, 120);
  try {
    await adicionarPagamento(bar.id, clienteId, valorCentavos, final);
    atualizar(clienteId);
    return { ok: true };
  } catch (error) { return falha(error, "Não consegui registrar o pagamento."); }
}

export async function registrarPagamentoDeItem(clienteId: string, lancamentoId: string,
  quantidade: number, nomePagador?: string): Promise<Resultado> {
  const { bar } = await exigirBar();
  try {
    await adicionarPagamentoPorItem(bar.id, clienteId, lancamentoId, quantidade, nomePagador);
    atualizar(clienteId);
    return { ok: true };
  } catch (error) { return falha(error, "Não consegui registrar o pagamento deste item."); }
}

export async function repetirItem(clienteId: string, item: {
  produto_id?: string | null; descricao?: string | null; valor_unitario_centavos: number;
}): Promise<Resultado> {
  const { bar } = await exigirBar();
  try {
    await repetirLancamento(bar.id, clienteId, item);
    atualizar(clienteId);
    return { ok: true };
  } catch (error) { return falha(error, "Não consegui repetir o item."); }
}

export async function removerPagamento(clienteId: string, pagamentoId: string): Promise<Resultado> {
  const { bar } = await exigirBar();
  try {
    await excluirPagamento(bar.id, clienteId, pagamentoId);
    atualizar(clienteId);
    return { ok: true };
  } catch (error) { return falha(error, "Não consegui desfazer o pagamento."); }
}

export async function fecharConta(clienteId: string): Promise<Resultado> {
  const { bar } = await exigirBar();
  try {
    await encerrarComanda(bar.id, clienteId);
    atualizar(clienteId);
    return { ok: true };
  } catch (error) { return falha(error, "Não consegui fechar a comanda."); }
}

export async function reabrirConta(clienteId: string): Promise<Resultado> {
  const { bar } = await exigirBar();
  try {
    await reabrirComanda(bar.id, clienteId);
    atualizar(clienteId);
    return { ok: true };
  } catch (error) { return falha(error, "Não consegui reabrir a comanda."); }
}
