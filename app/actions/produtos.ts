"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { parseReaisParaCentavos } from "@/lib/format";
import { SUPABASE_URL } from "@/lib/supabase/server";
import type { EstadoForm } from "@/app/actions/auth";

const PREFIXO_DA_FOTO = `${SUPABASE_URL}/storage/v1/object/public/produtos-imagens/`;

function caminhoNoStorage(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(PREFIXO_DA_FOTO)) return null;
  const caminho = url.slice(PREFIXO_DA_FOTO.length).split("?")[0];
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
  
  if (imagemUrl && !imagemUrl.startsWith(PREFIXO_DA_FOTO)) {
    return { ok: false, mensagem: "Essa foto não veio do upload do ButecoApp." };
  }

  const precoCentavos = parseReaisParaCentavos(precoBruto);
  if (precoCentavos === null || precoCentavos <= 0) {
    return { ok: false, mensagem: "Preço inválido." };
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

export async function atualizarEstoque(produtoId: string, quantidade: number) {
  const { supabase, bar } = await exigirBar();

  const { error } = await supabase
    .from("produtos")
    .update({ estoque_atual: Math.max(0, quantidade) })
    .eq("id", produtoId)
    .eq("bar_id", bar.id);

  if (error) return { ok: false, mensagem: "Erro ao atualizar estoque." };

  revalidatePath("/produtos");
  return { ok: true };
}