"use server";

import { revalidatePath } from "next/cache";
import { getNeonSession } from "@/lib/neon-session";
import { neonPool } from "@/lib/neon-db";
import { apagarObjeto, chaveDaImagem, listarObjetos } from "@/lib/r2";

export async function checarSeEhAdmin(): Promise<boolean> {
  return (await getNeonSession())?.isAdmin === true;
}

/** Every admin action must call this, including exported server actions. */
export async function exigirAdminVerificado(): Promise<boolean> {
  const session = await getNeonSession();
  return session?.isAdmin === true && session.mfaVerified;
}

export async function dispararManutencao(acao: "analisar") {
  if (!await exigirAdminVerificado()) {
    return { ok: false, mensagem: "Valide o segundo fator para usar o painel." };
  }
  if (acao !== "analisar") return { ok: false, mensagem: "Ação inválida." };
  try {
    await neonPool.query("ANALYZE");
    revalidatePath("/admin");
    return { ok: true, mensagem: "Estatísticas do banco atualizadas." };
  } catch (error) {
    console.error("[admin] ANALYZE falhou", error);
    return { ok: false, mensagem: "Não consegui atualizar as estatísticas." };
  }
}

export async function limparFotosOrfas(): Promise<{ ok: boolean; mensagem: string }> {
  if (!await exigirAdminVerificado()) {
    return { ok: false, mensagem: "Valide o segundo fator para usar o painel." };
  }
  try {
    const [bars, products] = await Promise.all([
      neonPool.query<{ id: string; foto_url: string | null }>(
        "SELECT id, foto_url FROM public.bars"),
      neonPool.query<{ bar_id: string; imagem_url: string | null }>(
        "SELECT bar_id, imagem_url FROM public.produtos"),
    ]);
    const used = new Set<string>();
    for (const bar of bars.rows) {
      const key = chaveDaImagem(bar.foto_url, "logos", bar.id);
      if (key) used.add(key);
    }
    for (const product of products.rows) {
      const key = chaveDaImagem(product.imagem_url, "produtos", product.bar_id);
      if (key) used.add(key);
    }
    const [items, logos] = await Promise.all([
      listarObjetos("produtos/"), listarObjetos("logos/"),
    ]);
    const cutoff = Date.now() - 60 * 60 * 1000;
    const stale = [...items, ...logos].filter(object =>
      object.modified && object.modified.getTime() < cutoff && !used.has(object.key));
    let deleted = 0;
    for (const object of stale) {
      await apagarObjeto(object.key);
      deleted++;
    }
    return { ok: true, mensagem: `${deleted} foto(s) sem referência removida(s).` };
  } catch (error) {
    console.error("[admin] limpeza R2 falhou", error);
    return { ok: false, mensagem: "A limpeza no R2 foi interrompida. Algumas fotos podem já ter sido removidas; tente novamente." };
  }
}
