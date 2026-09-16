"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { parseReaisParaCentavos } from "@/lib/format";
import type { EstadoForm } from "@/app/actions/auth";

const MARCADOR_BUCKET = "/storage/v1/object/public/produtos-imagens/";

function caminhoNoStorage(url: string | null | undefined): string | null {
  if (!url) return null;
  const pos = url.indexOf(MARCADOR_BUCKET);
  if (pos === -1) return null;
  const caminho = url.slice(pos + MARCADOR_BUCKET.length).split("?")[0];
  return caminho || null;
}

async function apagarFoto(
  supabase: Awaited<ReturnType<typeof exigirBar>>["supabase"],
  url: string | null | undefined,
) {
  const caminho = caminhoNoStorage(url);
  if (!caminho) return;
  try {
    await supabase.storage.from("produtos-imagens").remove([caminho]);
  } catch {}
}

function validarProduto(formData: FormData):
  | { ok: true; nome: string; precoCentavos: number; imagemUrl: string; categoria: string; estoque: number }
  | { ok: false; mensagem: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  const precoBruto = String(formData.get("preco") ?? "").trim();
  const imagemUrl = String(formData.get("imagem_url") ?? "").trim();
  const categoria = String(formData.get("categoria") ?? "outros");
  const estoque = parseInt(String(formData.get("estoque") ?? "0"));

  if (!nome) return { ok: false, mensagem: "O nome do produto é obrigatório." };
  if (nome.length < 2) return { ok: false, mensagem: "Digite o nome do produto." };
  
  // Validação flexível e segura: aceita qualquer URL legítima do bucket produtos-imagens
  if (imagemUrl && !caminhoNoStorage(imagemUrl)) {
    return { ok: false, mensagem: "Essa foto não veio do upload do ButecoApp." };
  }

  // Teto igual ao do banco (produtos_preco_teto, migration 0013). Sem esta
  // checagem, preço acima do limite passava pela action e só era recusado lá
  // embaixo, virando erro cru de constraint em vez de recado para o dono.
  const PRECO_MAXIMO_CENTAVOS = 10_000_000; // R$ 100.000,00

  const precoCentavos = parseReaisParaCentavos(precoBruto);
  if (precoCentavos === null) {
    return { ok: false, mensagem: "Preço inválido. Escreva assim: 14,00" };
  }
  if (precoCentavos <= 0) {
    return { ok: false, mensagem: "O preço precisa ser maior que zero." };
  }
  if (precoCentavos > PRECO_MAXIMO_CENTAVOS) {
    return { ok: false, mensagem: "Preço alto demais. O máximo é R$ 100.000,00." };
  }

  return { ok: true, nome, precoCentavos, imagemUrl, categoria, estoque };
}

export async function criarProduto(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const validacao = validarProduto(formData);
  if (!validacao.ok) return { ok: false, mensagem: validacao.mensagem };

  const { nome, precoCentavos, imagemUrl, categoria, estoque } = validacao;
  const { supabase, bar } = await exigirBar();

  const { error } = await supabase.from("produtos").insert({
    bar_id: bar.id,
    nome,
    preco_centavos: precoCentavos,
    imagem_url: imagemUrl || null,
    categoria,
    estoque_atual: estoque,
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

  const { nome, precoCentavos, imagemUrl, categoria, estoque } = validacao;
  const { supabase, bar } = await exigirBar();

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
      categoria,
      estoque_atual: estoque,
    })
    .eq("id", produtoId)
    .eq("bar_id", bar.id);

  if (error) return { ok: false, mensagem: "Não consegui atualizar o produto." };

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

  const { error } = await supabase.from("produtos").delete().eq("id", produtoId).eq("bar_id", bar.id);

  if (!error) {
    await apagarFoto(supabase, (produto as { imagem_url: string | null } | null)?.imagem_url);
  }

  revalidatePath("/produtos");
  redirect("/produtos");
}

/**
 * Ajuste rapido de estoque, pelo DELTA e nao pelo valor final.
 *
 * A versao anterior recebia o numero absoluto que o navegador calculou a
 * partir do que o servidor tinha renderizado. Isso perdia toque (todo clique
 * dado enquanto a gravacao corria era descartado) e perdia ajuste entre
 * aparelhos (celular e caixa mandavam absolutos calculados sobre a mesma
 * leitura, e o ultimo apagava o outro).
 *
 * Agora quem soma e o banco, sobre o valor que esta la na hora — ver
 * migration 0022. Quem autoriza continua sendo o RLS de `produtos`.
 */
export async function ajustarEstoque(produtoId: string, delta: number) {
  const { supabase } = await exigirBar();

  const { data, error } = await supabase.rpc("ajustar_estoque", {
    p_produto_id: produtoId,
    p_delta: delta,
  });

  // `null` = o RLS barrou ou o produto nao e deste bar. Nao e erro de rede.
  if (error || data === null) {
    return { ok: false, mensagem: "Nao consegui atualizar o estoque." };
  }

  revalidatePath("/produtos");
  return { ok: true, estoque: data as number };
}