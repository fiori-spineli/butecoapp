"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { parseReaisParaCentavos } from "@/lib/format";
import { SUPABASE_URL } from "@/lib/supabase/server";
import type { EstadoForm } from "@/app/actions/auth";

/**
 * De onde uma foto de produto pode vir.
 *
 * O campo `imagem_url` é um input escondido no formulário, preenchido pela
 * resposta do nosso próprio upload. Só que "escondido" vale para a pessoa, não
 * para quem monta a requisição na mão: sem conferir, o dono de um bar poderia
 * gravar a URL de um servidor qualquer e passar a receber o IP de todo cliente
 * que abrisse a comanda pelo QR.
 *
 * O `next/image` já recusaria carregar um domínio fora do next.config, mas
 * isso é sorte de configuração — a regra tem de estar em quem grava.
 */
const PREFIXO_DA_FOTO = `${SUPABASE_URL}/storage/v1/object/public/produtos-imagens/`;

/**
 * Nome e preço são obrigatórios, e preço zero não conta como preço.
 *
 * O `required` do HTML já barra o campo vazio, mas ele vive no navegador: some
 * com o JavaScript desligado e não existe para quem manda o formulário na mão.
 * Quem grava é quem tem de garantir — por isso a mesma regra está aqui, e uma
 * terceira vez no CHECK da tabela (migration 0010).
 *
 * Zero é recusado de propósito: um item de R$ 0,00 aparece na conta do cliente
 * como cortesia e some do faturamento. Cortesia se registra como pagamento,
 * não como preço.
 */
function validarProduto(formData: FormData):
  | { ok: true; nome: string; precoCentavos: number; imagemUrl: string }
  | { ok: false; mensagem: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  const precoBruto = String(formData.get("preco") ?? "").trim();
  const imagemUrl = String(formData.get("imagem_url") ?? "").trim();

  if (!nome) return { ok: false, mensagem: "O nome do produto é obrigatório." };
  if (nome.length < 2) return { ok: false, mensagem: "Digite o nome do produto." };
  if (nome.length > 120) return { ok: false, mensagem: "O nome do produto ficou longo demais." };

  if (imagemUrl && !imagemUrl.startsWith(PREFIXO_DA_FOTO)) {
    return {
      ok: false,
      mensagem: "Essa foto não veio do upload do ButecoApp. Escolha a imagem de novo.",
    };
  }

  if (!precoBruto) return { ok: false, mensagem: "O preço é obrigatório." };

  const precoCentavos = parseReaisParaCentavos(precoBruto);
  if (precoCentavos === null) {
    return {
      ok: false,
      mensagem: "Preço inválido. Use vírgula para os centavos, como 12,50.",
    };
  }
  if (precoCentavos === 0) {
    return { ok: false, mensagem: "O preço precisa ser maior que zero." };
  }

  return { ok: true, nome, precoCentavos, imagemUrl };
}

export async function criarProduto(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const validacao = validarProduto(formData);
  if (!validacao.ok) return { ok: false, mensagem: validacao.mensagem };

  const { nome, precoCentavos, imagemUrl } = validacao;
  const { supabase, bar } = await exigirBar();

  const { error } = await supabase.from("produtos").insert({
    bar_id: bar.id,
    nome,
    preco_centavos: precoCentavos,
    imagem_url: imagemUrl || null,
  });

  if (error) return { ok: false, mensagem: "Não consegui salvar o produto." };

  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function atualizarProduto(
  produtoId: string,
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const validacao = validarProduto(formData);
  if (!validacao.ok) return { ok: false, mensagem: validacao.mensagem };

  const { nome, precoCentavos, imagemUrl } = validacao;
  const { supabase, bar } = await exigirBar();

  const { error } = await supabase
    .from("produtos")
    .update({
      nome,
      preco_centavos: precoCentavos,
      imagem_url: imagemUrl || null,
    })
    .eq("id", produtoId)
    .eq("bar_id", bar.id);

  if (error) return { ok: false, mensagem: "Não consegui atualizar o produto." };

  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function removerProduto(produtoId: string) {
  const { supabase, bar } = await exigirBar();
  await supabase.from("produtos").delete().eq("id", produtoId).eq("bar_id", bar.id);
  revalidatePath("/produtos");
  redirect("/produtos");
}