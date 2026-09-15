"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { formatarReais } from "@/lib/format";
import type { EstadoForm } from "@/app/actions/auth";

export type ItemParaLancar =
  | { tipo: "produto"; produto_id: string; quantidade: number }
  | { tipo: "livre"; descricao: string; valor_centavos: number; quantidade: number };

export type Resultado = { ok: boolean; mensagem?: string };

/** Tetos que espelham os CHECKs da migration 0013. Recusar aqui dá mensagem melhor. */
const LIMITES = {
  nomeComanda: 80,
  numeroMesa: 20,
  descricaoItem: 120,
  quantidadeMax: 999,
  valorUnitarioMax: 10_000_000,
  descricaoPagamento: 120,
} as const;

function mensagemDoBanco(error: { code?: string; message?: string } | null, generica: string) {
  if (error?.code === "23514" && error.message && !/violates|constraint/i.test(error.message)) {
    return error.message;
  }
  return generica;
}

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
  if (nome.length > LIMITES.nomeComanda) {
    return { ok: false, mensagem: `O nome pode ter até ${LIMITES.nomeComanda} caracteres.` };
  }
  if (numeroMesa.length > LIMITES.numeroMesa) {
    return { ok: false, mensagem: `O número da mesa pode ter até ${LIMITES.numeroMesa} caracteres.` };
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

/** Lança itens na comanda. */
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

  const linhas = [];

  for (const item of itens) {
    const quantidade = Math.trunc(Number(item.quantidade));
    if (!Number.isFinite(quantidade) || quantidade < 1 || quantidade > LIMITES.quantidadeMax) {
      return { ok: false, mensagem: `Quantidade precisa ser de 1 a ${LIMITES.quantidadeMax}.` };
    }

    if (item.tipo === "produto") {
      const preco = precos.get(item.produto_id);
      if (preco === undefined) {
        return { ok: false, mensagem: "Um dos produtos não existe mais no catálogo. Atualize a tela." };
      }
      linhas.push({
        cliente_id: clienteId,
        produto_id: item.produto_id,
        descricao: null,
        quantidade,
        valor_unitario_centavos: preco,
      });
      continue;
    }

    const valor = Math.trunc(Number(item.valor_centavos));
    if (!Number.isFinite(valor) || valor <= 0 || valor > LIMITES.valorUnitarioMax) {
      return { ok: false, mensagem: "Item avulso precisa de um valor maior que zero." };
    }
    const descricao = item.descricao.trim().slice(0, LIMITES.descricaoItem) || "Item avulso";
    linhas.push({
      cliente_id: clienteId,
      produto_id: null,
      descricao,
      quantidade,
      valor_unitario_centavos: valor,
    });
  }

  const { error } = await supabase.from("lancamentos").insert(linhas);
  if (error) return { ok: false, mensagem: mensagemDoBanco(error, "Não consegui lançar o item.") };

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
  if (error) return { ok: false, mensagem: mensagemDoBanco(error, "Não consegui remover o item.") };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Pagamento avulso ou divisão igual (com identificador de quem pagou opcional) */
export async function registrarPagamento(
  clienteId: string,
  valorCentavos: number,
  descricao: string,
  nomePagador?: string,
): Promise<Resultado> {
  const valor = Math.trunc(valorCentavos);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { ok: false, mensagem: "Valor inválido." };
  }

  const { supabase } = await exigirBar();

  const { data: resumo } = await supabase
    .from("comandas_resumo")
    .select("restante_centavos")
    .eq("id", clienteId)
    .maybeSingle();

  if (!resumo) {
    return { ok: false, mensagem: "Comanda não encontrada." };
  }

  const restante = resumo.restante_centavos as number;
  if (valor > restante) {
    return {
      ok: false,
      mensagem: `Falta ${formatarReais(restante)} nessa conta — o valor registrado não pode passar disso.`,
    };
  }

  const pagador = nomePagador?.trim();
  const descBase = descricao.trim();
  const descFinal = pagador
    ? `${pagador} · ${descBase}`.slice(0, LIMITES.descricaoPagamento)
    : descBase.slice(0, LIMITES.descricaoPagamento) || null;

  const { error } = await supabase.from("pagamentos").insert({
    cliente_id: clienteId,
    lancamento_id: null,
    quantidade_paga: null,
    valor_centavos: valor,
    descricao: descFinal,
  });

  if (error) return { ok: false, mensagem: mensagemDoBanco(error, "Não consegui registrar o pagamento.") };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Pagamento parcial por item (com identificador de quem pagou opcional) */
export async function registrarPagamentoDeItem(
  clienteId: string,
  lancamentoId: string,
  quantidade: number,
  nomePagador?: string,
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

  const valorDoPagamento = qtd * (lancamento.valor_unitario_centavos as number);

  const { data: resumo } = await supabase
    .from("comandas_resumo")
    .select("restante_centavos")
    .eq("id", clienteId)
    .maybeSingle();

  if (!resumo) {
    return { ok: false, mensagem: "Comanda não encontrada." };
  }

  const restanteDaConta = resumo.restante_centavos as number;

  if (valorDoPagamento > restanteDaConta) {
    return {
      ok: false,
      mensagem:
        restanteDaConta <= 0
          ? "Esta conta já está quitada — não há saldo em aberto para abater."
          : `Faltam só ${formatarReais(restanteDaConta)} nesta conta, e esse item custa ${formatarReais(valorDoPagamento)}. Parte dele já foi coberta por um pagamento avulso.`,
    };
  }

  const nomeDoItem =
    ((lancamento as { produtos?: { nome?: string } | null }).produtos?.nome ??
      (lancamento.descricao as string | null)) ||
    "item";

  const pagador = nomePagador?.trim();
  const descBase = `${qtd}x ${nomeDoItem}`;
  const descFinal = pagador
    ? `${pagador} · ${descBase}`.slice(0, LIMITES.descricaoPagamento)
    : descBase.slice(0, LIMITES.descricaoPagamento);

  const { error } = await supabase.from("pagamentos").insert({
    cliente_id: clienteId,
    lancamento_id: lancamentoId,
    quantidade_paga: qtd,
    valor_centavos: valorDoPagamento,
    descricao: descFinal,
  });

  if (error) return { ok: false, mensagem: mensagemDoBanco(error, "Não consegui registrar o pagamento.") };

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
  if (error) return { ok: false, mensagem: mensagemDoBanco(error, "Não consegui desfazer o pagamento.") };

  revalidatePath(`/comanda/${clienteId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function fecharConta(clienteId: string): Promise<Resultado> {
  const { supabase } = await exigirBar();

  const { data: resumo } = await supabase
    .from("comandas_resumo")
    .select("restante_centavos, status")
    .eq("id", clienteId)
    .maybeSingle();

  if (!resumo) return { ok: false, mensagem: "Comanda não encontrada." };
  if (resumo.status === "fechada") return { ok: true };

  const restante = (resumo.restante_centavos as number | undefined) ?? 0;

  if (restante > 0) {
    const { error: erroAcerto } = await supabase.from("pagamentos").insert({
      cliente_id: clienteId,
      lancamento_id: null,
      quantidade_paga: null,
      valor_centavos: restante,
      descricao: "Acerto no fechamento",
    });

    if (erroAcerto) {
      return { ok: false, mensagem: mensagemDoBanco(erroAcerto, "Não consegui registrar o acerto final.") };
    }
  }

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