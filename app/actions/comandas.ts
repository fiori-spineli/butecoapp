"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import type { EstadoForm } from "@/app/actions/auth";

export type ItemParaLancar =
  | { tipo: "produto"; produto_id: string; quantidade: number }
  | { tipo: "livre"; descricao: string; valor_centavos: number; quantidade: number };

export type Resultado = { ok: boolean; mensagem?: string };

/** Abre uma comanda nova (individual ou de mesa) e leva direto pro QR. */
export async function criarComanda(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const numeroMesa = String(formData.get("numero_mesa") ?? "").trim();

  if (nome.length < 1) {
    return { ok: false, mensagem: "Dê um nome pra comanda (cliente ou mesa)." };
  }

  const { supabase, bar } = await exigirBar();

  const { data, error } = await supabase
    .from("clientes")
    .insert({ bar_id: bar.id, nome, numero_mesa: numeroMesa || null })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, mensagem: "Não consegui abrir a comanda. Tente de novo." };
  }

  revalidatePath("/dashboard");
  redirect(`/comanda/${data.id}?nova=1`);
}

/**
 * Lança itens na comanda. Os preços vêm SEMPRE do catálogo no banco —
 * nunca do que o navegador mandou.
 */
export async function lancarItens(
  clienteId: string,
  itens: ItemParaLancar[],
): Promise<Resultado> {
  if (itens.length === 0) return { ok: false, mensagem: "Nenhum item selecionado." };

  const { supabase } = await exigirBar();

  const idsDeProduto = itens
    .filter((item) => item.tipo === "produto")
    .map((item) => item.produto_id);

  const precos = new Map<string, number>();
  if (idsDeProduto.length > 0) {
    const { data: produtos, error } = await supabase
      .from("produtos")
      .select("id, preco_centavos")
      .in("id", idsDeProduto);

    if (error) return { ok: false, mensagem: "Não consegui ler o catálogo." };
    for (const produto of produtos ?? []) {
      precos.set(produto.id as string, produto.preco_centavos as number);
    }
  }

  const linhas = itens.map((item) => {
    const quantidade = Math.max(1, Math.trunc(item.quantidade));
    if (item.tipo === "produto") {
      return {
        cliente_id: clienteId,
        produto_id: item.produto_id,
        descricao: null,
        quantidade,
        valor_unitario_centavos: precos.get(item.produto_id) ?? 0,
      };
    }
    return {
      cliente_id: clienteId,
      produto_id: null,
      descricao: item.descricao.trim() || "Item avulso",
      quantidade,
      valor_unitario_centavos: Math.max(0, Math.trunc(item.valor_centavos)),
    };
  });

  const { error } = await supabase.from("lancamentos").insert(linhas);
  if (error) return { ok: false, mensagem: "Não consegui lançar o item." };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removerLancamento(
  clienteId: string,
  lancamentoId: string,
): Promise<Resultado> {
  const { supabase } = await exigirBar();

  const { error } = await supabase.from("lancamentos").delete().eq("id", lancamentoId);
  if (error) return { ok: false, mensagem: "Não consegui remover o item." };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Pagamento avulso — o caso da divisão igualitária (não amarra a item nenhum). */
export async function registrarPagamento(
  clienteId: string,
  valorCentavos: number,
  descricao: string,
): Promise<Resultado> {
  const valor = Math.trunc(valorCentavos);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, mensagem: "Valor inválido." };
  }

  const { supabase } = await exigirBar();

  const { error } = await supabase.from("pagamentos").insert({
    cliente_id: clienteId,
    lancamento_id: null,
    quantidade_paga: null,
    valor_centavos: valor,
    descricao: descricao.trim() || null,
  });

  if (error) return { ok: false, mensagem: "Não consegui registrar o pagamento." };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Pagamento parcial por item: marca N unidades de um lançamento como pagas. */
export async function registrarPagamentoDeItem(
  clienteId: string,
  lancamentoId: string,
  quantidade: number,
): Promise<Resultado> {
  const qtd = Math.trunc(quantidade);
  if (!Number.isFinite(qtd) || qtd <= 0) {
    return { ok: false, mensagem: "Quantidade inválida." };
  }

  const { supabase } = await exigirBar();

  const { data: lancamento, error: erroLancamento } = await supabase
    .from("lancamentos")
    .select("id, quantidade, valor_unitario_centavos, produtos(nome), descricao")
    .eq("id", lancamentoId)
    .single();

  if (erroLancamento || !lancamento) {
    return { ok: false, mensagem: "Item não encontrado." };
  }

  const { data: pagamentosDoItem } = await supabase
    .from("pagamentos")
    .select("quantidade_paga")
    .eq("lancamento_id", lancamentoId);

  const jaPagas = (pagamentosDoItem ?? []).reduce(
    (soma, pagamento) => soma + (pagamento.quantidade_paga ?? 0),
    0,
  );
  const restantes = (lancamento.quantidade as number) - jaPagas;

  if (qtd > restantes) {
    return {
      ok: false,
      mensagem: `Só ${restantes} unidade(s) desse item ainda estão em aberto.`,
    };
  }

  const nomeDoItem =
    ((lancamento as { produtos?: { nome?: string } | null }).produtos?.nome ??
      (lancamento.descricao as string | null)) ||
    "item";

  const { error } = await supabase.from("pagamentos").insert({
    cliente_id: clienteId,
    lancamento_id: lancamentoId,
    quantidade_paga: qtd,
    valor_centavos: qtd * (lancamento.valor_unitario_centavos as number),
    descricao: `${qtd}x ${nomeDoItem}`,
  });

  if (error) return { ok: false, mensagem: "Não consegui registrar o pagamento." };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removerPagamento(
  clienteId: string,
  pagamentoId: string,
): Promise<Resultado> {
  const { supabase } = await exigirBar();

  const { error } = await supabase.from("pagamentos").delete().eq("id", pagamentoId);
  if (error) return { ok: false, mensagem: "Não consegui desfazer o pagamento." };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function fecharConta(clienteId: string): Promise<Resultado> {
  const { supabase } = await exigirBar();

  const { error } = await supabase
    .from("clientes")
    .update({ status: "fechada", fechada_em: new Date().toISOString() })
    .eq("id", clienteId);

  if (error) return { ok: false, mensagem: "Não consegui fechar a conta." };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function reabrirConta(clienteId: string): Promise<Resultado> {
  const { supabase } = await exigirBar();

  const { error } = await supabase
    .from("clientes")
    .update({ status: "aberta", fechada_em: null })
    .eq("id", clienteId);

  if (error) return { ok: false, mensagem: "Não consegui reabrir a conta." };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
