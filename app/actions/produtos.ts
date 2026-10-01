"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { neonPool } from "@/lib/neon-db";
import { apagarImagem, chaveDaImagem } from "@/lib/r2";
import { parseReaisParaCentavos } from "@/lib/format";
import type { EstadoForm } from "@/app/actions/auth";

const categorias = new Set(["comida", "bebida", "entretenimento", "servico", "outros"]);

function validar(formData: FormData):
  | { ok: true; nome: string; preco: number; imagem: string | null;
      categoria: string | null; estoque: number | null }
  | { ok: false; mensagem: string } {
  const nome = String(formData.get("nome") ?? "").trim();
  const preco = parseReaisParaCentavos(String(formData.get("preco") ?? "").trim());
  const imagem = String(formData.get("imagem_url") ?? "").trim() || null;
  const categoria = formData.has("categoria") ? String(formData.get("categoria")) : null;
  const estoque = formData.has("estoque") ? Number(formData.get("estoque")) : null;
  if (nome.length < 2 || nome.length > 120) {
    return { ok: false, mensagem: "Nome do produto inválido." };
  }
  if (preco === null || preco < 1 || preco > 1_000_000) {
    return { ok: false, mensagem: "Preço inválido. O máximo é R$ 10.000,00." };
  }
  if (categoria !== null && !categorias.has(categoria)) {
    return { ok: false, mensagem: "Categoria inválida." };
  }
  if (estoque !== null && (!Number.isSafeInteger(estoque) || estoque < 0 || estoque > 99_999)) {
    return { ok: false, mensagem: "Estoque inválido." };
  }
  return { ok: true, nome, preco, imagem, categoria, estoque };
}

export async function criarProduto(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { bar } = await exigirBar();
  const item = validar(formData);
  if (!item.ok) return item;
  if (item.imagem && !chaveDaImagem(item.imagem, "produtos", bar.id)) {
    return { ok: false, mensagem: "A foto precisa vir do upload deste bar." };
  }
  try {
    await neonPool.query(
      `INSERT INTO public.produtos
       (bar_id, nome, preco_centavos, imagem_url, categoria, estoque_atual)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [bar.id, item.nome, item.preco, item.imagem, item.categoria ?? "outros", item.estoque ?? 0],
    );
  } catch (error) {
    console.error("[produto] criação falhou", error);
    return { ok: false, mensagem: "Não consegui salvar o produto." };
  }
  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function atualizarProduto(produtoId: string, _anterior: EstadoForm,
  formData: FormData): Promise<EstadoForm> {
  const { bar } = await exigirBar();
  const item = validar(formData);
  if (!item.ok) return item;
  const { rows } = await neonPool.query<{ imagem_url: string | null }>(
    "SELECT imagem_url FROM public.produtos WHERE id = $1 AND bar_id = $2",
    [produtoId, bar.id],
  );
  if (!rows[0]) return { ok: false, mensagem: "Produto não encontrado." };
  if (item.imagem && item.imagem !== rows[0].imagem_url &&
      !chaveDaImagem(item.imagem, "produtos", bar.id)) {
    return { ok: false, mensagem: "A foto precisa vir do upload deste bar." };
  }
  try {
    await neonPool.query(
      `UPDATE public.produtos SET nome = $1, preco_centavos = $2, imagem_url = $3,
              categoria = COALESCE($4, categoria), estoque_atual = COALESCE($5, estoque_atual)
        WHERE id = $6 AND bar_id = $7`,
      [item.nome, item.preco, item.imagem, item.categoria, item.estoque, produtoId, bar.id],
    );
  } catch (error) {
    console.error("[produto] atualização falhou", error);
    return { ok: false, mensagem: "Não consegui atualizar o produto." };
  }
  if (rows[0].imagem_url && rows[0].imagem_url !== item.imagem) {
    try { await apagarImagem(rows[0].imagem_url, "produtos", bar.id); }
    catch (error) { console.error("[produto] limpeza de imagem falhou", error); }
  }
  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function removerProduto(produtoId: string): Promise<EstadoForm> {
  const { bar } = await exigirBar();
  const { rows } = await neonPool.query<{ imagem_url: string | null }>(
    "SELECT imagem_url FROM public.produtos WHERE id = $1 AND bar_id = $2",
    [produtoId, bar.id],
  );
  if (!rows[0]) return { ok: false, mensagem: "Produto não encontrado." };
  try {
    await neonPool.query("DELETE FROM public.produtos WHERE id = $1 AND bar_id = $2",
      [produtoId, bar.id]);
  } catch (error) {
    console.error("[produto] exclusão falhou", error);
    return { ok: false, mensagem: "Produto usado em uma comanda não pode ser removido." };
  }
  try { await apagarImagem(rows[0].imagem_url, "produtos", bar.id); }
  catch (error) { console.error("[produto] limpeza de imagem falhou", error); }
  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function ajustarEstoque(produtoId: string, delta: number) {
  const { bar } = await exigirBar();
  if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 99_999) {
    return { ok: false, mensagem: "Ajuste inválido." };
  }
  const { rows } = await neonPool.query<{ estoque_atual: number }>(
    `UPDATE public.produtos SET estoque_atual = estoque_atual + $1
      WHERE id = $2 AND bar_id = $3 AND estoque_atual + $1 BETWEEN 0 AND 99999
      RETURNING estoque_atual`, [delta, produtoId, bar.id],
  );
  if (!rows[0]) return { ok: false, mensagem: "Estoque fora do limite ou produto não encontrado." };
  revalidatePath("/produtos");
  return { ok: true, estoque: rows[0].estoque_atual };
}
