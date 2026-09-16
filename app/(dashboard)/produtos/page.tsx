import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import { TabBar } from "@/components/tab-bar";
import { CabecalhoDono } from "@/components/cabecalho-dono";
import { CardProduto } from "@/components/card-produto";
import type { Produto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProdutosPage() {
  const { supabase, bar } = await exigirBar();

  const { data } = await supabase
    .from("produtos")
    .select("*")
    .eq("bar_id", bar.id)
    .order("nome");

  const produtos = (data ?? []) as Produto[];

  return (
    <>
      <CabecalhoDono ativo="produtos" fotoUrl={bar.foto_url} nomeBar={bar.nome} acoes={
          <Link
            href="/produtos/novo"
            prefetch={true}
            className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-4 sm:px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo produto
          </Link>
        }
      />

      <main className="flex-1 px-6 py-6">
        <div className="flex justify-between items-end mb-6">
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            {produtos.length} {produtos.length === 1 ? "item cadastrado" : "itens cadastrados"}
          </span>
        </div>

        {produtos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-12 text-center text-sm text-stone-500 dark:text-stone-400">
            Nenhum produto cadastrado no momento. Toque em &quot;Novo produto&quot; para adicionar seu cardápio.
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {produtos.map((produto) => (
              <CardProduto key={produto.id} produto={produto} />
            ))}
          </ul>
        )}
      </main>
      <TabBar ativo="produtos" />
    </>
  );
}