"use server";

import { revalidatePath } from "next/cache";
import { getNeonSession, type NeonSession } from "@/lib/neon-session";
import { auditar } from "@/lib/auditoria";
import { neonPool } from "@/lib/neon-db";
import { apagarObjeto, chaveDaImagem, listarObjetos, urlPublicaDaChave } from "@/lib/r2";

export async function checarSeEhAdmin(): Promise<boolean> {
  return (await getNeonSession())?.isAdmin === true;
}

/**
 * Every admin action must call this, including exported server actions.
 * Returns the verified session (truthy) so the caller can record who acted.
 */
export async function exigirAdminVerificado(): Promise<NeonSession | null> {
  const session = await getNeonSession();
  return session?.isAdmin === true && session.mfaVerified ? session : null;
}

export async function dispararManutencao(acao: "analisar") {
  const admin = await exigirAdminVerificado();
  if (!admin) {
    return { ok: false, mensagem: "Valide o segundo fator para usar o painel." };
  }
  if (acao !== "analisar") return { ok: false, mensagem: "Ação inválida." };
  try {
    await neonPool.query("ANALYZE");
    await auditar("manutencao", { ator: admin.userId, ok: true, detalhe: "ANALYZE" });
    revalidatePath("/admin");
    return { ok: true, mensagem: "Estatísticas do banco atualizadas." };
  } catch (error) {
    console.error("[admin] ANALYZE falhou", error);
    return { ok: false, mensagem: "Não consegui atualizar as estatísticas." };
  }
}

export async function limparFotosOrfas(): Promise<{ ok: boolean; mensagem: string }> {
  const admin = await exigirAdminVerificado();
  if (!admin) {
    return { ok: false, mensagem: "Valide o segundo fator para usar o painel." };
  }
  try {
    // Order matters. Listing the bucket FIRST means any object we may delete
    // already existed when the references were read afterwards.
    const [items, logos] = await Promise.all([
      listarObjetos("produtos/"), listarObjetos("logos/"),
    ]);
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
    // A day, not an hour: a photo is uploaded when picked and referenced only when
    // the product form is saved, and a form can sit open through a whole shift.
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const stale = [...items, ...logos].filter(object =>
      object.modified && object.modified.getTime() < cutoff && !used.has(object.key));
    let deleted = 0;
    for (const object of stale) {
      // Re-check right before deleting: a product saved during this sweep points
      // at an object we listed as orphan a moment ago.
      const url = urlPublicaDaChave(object.key);
      const { rows } = await neonPool.query<{ usada: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM public.produtos WHERE imagem_url = $1)
             OR EXISTS (SELECT 1 FROM public.bars WHERE foto_url = $1) AS usada`, [url]);
      if (rows[0].usada) continue;
      await apagarObjeto(object.key);
      deleted++;
    }
    await auditar("limpeza_r2", { ator: admin.userId, ok: true, detalhe: `${deleted} removida(s)` });
    return { ok: true, mensagem: `${deleted} foto(s) sem referência removida(s).` };
  } catch (error) {
    console.error("[admin] limpeza R2 falhou", error);
    return { ok: false, mensagem: "A limpeza no R2 foi interrompida. Algumas fotos podem já ter sido removidas; tente novamente." };
  }
}
