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

/** O caminho dentro do bucket, a partir da URL pública. `null` se não for nossa. */
function caminhoNoStorage(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(PREFIXO_DA_FOTO)) return null;
  const caminho = url.slice(PREFIXO_DA_FOTO.length).split("?")[0];
  return caminho || null;
}

/**
 * Apaga a foto antiga do Storage.
 *
 * Trocar a foto de um produto gravava a URL nova e deixava o arquivo velho para
 * trás. Ninguém mais o enxergava, mas ele continuava ocupando espaço no bucket
 * — e o plano gratuito tem 1 GB. Com o dono trocando a foto da cerveja algumas
 * vezes por mês, isso vira lixo que só cresce.
 *
 * Falha aqui não derruba a operação: se a remoção do arquivo não for, o produto
 * já foi salvo e o pior caso é o arquivo órfão que existia antes.
 */
async function apagarFoto(
  supabase: Awaited<ReturnType<typeof exigirBar>>["supabase"],
  url: string | null | undefined,
) {
  const caminho = caminhoNoStorage(url);
  if (!caminho) return;

  try {
    await supabase.storage.from("produtos-imagens").remove([caminho]);
  } catch {
    // Silêncio de propósito — ver o comentário acima.
  }
}

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

  // Lê a foto atual ANTES de gravar: depois do update ela some da linha e não
  // haveria mais como saber qual arquivo apagar.
  const { data: antes } = await supabase
    .from("produtos")
    .select("imagem_url")
    .eq("id", produtoId)
    .eq("bar_id", bar.id)
    .maybeSingle();

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

  // Só depois de o banco confirmar. Apagar antes deixaria o produto apontando
  // para um arquivo que já não existe, se o update falhasse.
  const fotoAntiga = (antes as { imagem_url: string | null } | null)?.imagem_url;
  if (fotoAntiga && fotoAntiga !== (imagemUrl || null)) {
    await apagarFoto(supabase, fotoAntiga);
  }

  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function removerProduto(produtoId: string) {
  const { supabase, bar } = await exigirBar();

  const { data: produto } = await supabase
    .from("produtos")
    .select("imagem_url")
    .eq("id", produtoId)
    .eq("bar_id", bar.id)
    .maybeSingle();

  const { error } = await supabase
    .from("produtos")
    .delete()
    .eq("id", produtoId)
    .eq("bar_id", bar.id);

  // Produto apagado leva a foto junto: sem a linha no banco, nada mais no app
  // aponta para aquele arquivo.
  if (!error) {
    await apagarFoto(supabase, (produto as { imagem_url: string | null } | null)?.imagem_url);
  }

  revalidatePath("/produtos");
  redirect("/produtos");
}