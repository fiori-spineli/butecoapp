"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { parseReaisParaCentavos } from "@/lib/format";
import type { EstadoForm } from "@/app/actions/auth";

const MARCADOR_BUCKET = "/storage/v1/object/public/produtos-imagens/";

/** As mesmas do CHECK de produtos.categoria (migration 0018). */
const CATEGORIAS = new Set(["comida", "bebida", "entretenimento", "servico", "outros"]);

const ESTOQUE_MAXIMO = 99_999;

/**
 * A foto tem de ser do NOSSO Storage e da pasta DESTE bar.
 *
 * A conferência anterior só procurava o trecho do caminho em qualquer lugar da
 * string: aceitava o bucket de outro projeto Supabase, de outro bar, e até
 * `javascript:x//storage/v1/object/public/produtos-imagens/x` (auditoria de
 * 2026-09-24). Aqui a URL é desmontada e cada parte comparada por igualdade.
 */
function fotoDoBar(url: string, barId: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const alvo = new URL(url);
    return (
      alvo.origin === new URL(base).origin &&
      alvo.pathname.startsWith(`${MARCADOR_BUCKET}${barId}/`) &&
      !alvo.pathname.includes("..") &&
      !alvo.search &&
      !alvo.hash
    );
  } catch {
    return false;
  }
}

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

/**
 * Categoria e estoque só entram quando o formulário os manda.
 *
 * O formulário de edição tem só foto, nome e preço; o estoque muda pelos
 * botões de +/- (ajustarEstoque). A versão anterior preenchia o que faltava
 * com "outros" e 0 e gravava por cima: editar o preço de uma cerveja zerava o
 * estoque dela (auditoria de 2026-09-24). `undefined` aqui quer dizer "não
 * mexa".
 */
function validarProduto(formData: FormData, barId: string):
  | {
      ok: true;
      nome: string;
      precoCentavos: number;
      imagemUrl: string;
      categoria: string | undefined;
      estoque: number | undefined;
    }
  | { ok: false; mensagem: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  const precoBruto = String(formData.get("preco") ?? "").trim();
  const imagemUrl = String(formData.get("imagem_url") ?? "").trim();
  const categoriaBruta = formData.get("categoria");
  const estoqueBruto = formData.get("estoque");

  if (!nome) return { ok: false, mensagem: "O nome do produto é obrigatório." };
  if (nome.length < 2) return { ok: false, mensagem: "Digite o nome do produto." };

  if (imagemUrl && !fotoDoBar(imagemUrl, barId)) {
    return { ok: false, mensagem: "Essa foto não veio do upload do ButecoApp." };
  }

  let categoria: string | undefined;
  if (categoriaBruta !== null) {
    categoria = String(categoriaBruta);
    if (!CATEGORIAS.has(categoria)) return { ok: false, mensagem: "Categoria inválida." };
  }

  let estoque: number | undefined;
  if (estoqueBruto !== null) {
    estoque = Number(String(estoqueBruto).trim());
    if (!Number.isSafeInteger(estoque) || estoque < 0 || estoque > ESTOQUE_MAXIMO) {
      return { ok: false, mensagem: "Estoque inválido. Use um número inteiro de 0 a 99.999." };
    }
  }

  // Teto igual ao do banco (produtos_preco_teto, migration 0013). Sem esta
  // checagem, preço acima do limite passava pela action e só era recusado lá
  // embaixo, virando erro cru de constraint em vez de recado para o dono.
  // Teto de R$ 10.000,00: é buteco, não casa de leilão. O número existe para
  // barrar dedo escorregado (digitar 1000000 no lugar de 10,00), não para
  // limitar negócio nenhum de verdade.
  const PRECO_MAXIMO_CENTAVOS = 1_000_000; // R$ 10.000,00

  const precoCentavos = parseReaisParaCentavos(precoBruto);
  if (precoCentavos === null) {
    return { ok: false, mensagem: "Preço inválido. Escreva assim: 14,00" };
  }
  if (precoCentavos <= 0) {
    return { ok: false, mensagem: "O preço precisa ser maior que zero." };
  }
  if (precoCentavos > PRECO_MAXIMO_CENTAVOS) {
    return { ok: false, mensagem: "Preço alto demais. O máximo é R$ 10.000,00." };
  }

  return { ok: true, nome, precoCentavos, imagemUrl, categoria, estoque };
}

export async function criarProduto(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { supabase, bar } = await exigirBar();
  const validacao = validarProduto(formData, bar.id);
  if (!validacao.ok) return { ok: false, mensagem: validacao.mensagem };

  const { nome, precoCentavos, imagemUrl, categoria, estoque } = validacao;

  const { error } = await supabase.from("produtos").insert({
    bar_id: bar.id,
    nome,
    preco_centavos: precoCentavos,
    imagem_url: imagemUrl || null,
    categoria: categoria ?? "outros",
    estoque_atual: estoque ?? 0,
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
  const { supabase, bar } = await exigirBar();
  const validacao = validarProduto(formData, bar.id);
  if (!validacao.ok) return { ok: false, mensagem: validacao.mensagem };

  const { nome, precoCentavos, imagemUrl, categoria, estoque } = validacao;

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
      ...(categoria !== undefined ? { categoria } : {}),
      ...(estoque !== undefined ? { estoque_atual: estoque } : {}),
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