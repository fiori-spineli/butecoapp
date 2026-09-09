import Image from "next/image";
import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import { formatarReais } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
import { TemaToggle } from "@/components/tema-toggle";
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
      <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4">
        <div>
          <h1 className="text-lg md:text-xl font-black text-stone-900 dark:text-stone-100">
            Catálogo de Produtos
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {produtos.length} item{produtos.length === 1 ? "" : "s"} cadastrado{produtos.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <TemaToggle />
          <Link
            href="/produtos/novo"
            className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
          >
            + Novo produto
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-6">
        {produtos.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center p-10 text-center">
            <div className="size-16 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-2xl text-stone-400 mb-3">
              🍺
            </div>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Nenhum produto cadastrado
            </p>
            <p className="mt-1 max-w-[34ch] text-xs text-stone-500 dark:text-stone-400">
              Cadastre as cervejas, porções e doses mais pedidas para lançar com rapidez na comanda.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {produtos.map((produto) => (
              <li
                key={produto.id}
                className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs hover:border-amber-600 dark:hover:border-amber-500 transition-colors"
              >
                <div className="relative flex aspect-square items-center justify-center bg-stone-100 dark:bg-stone-800">
                  {produto.imagem_url ? (
                    <Image
                      src={produto.imagem_url}
                      alt={produto.nome}
                      fill
                      className="size-full object-cover"
                    />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-stone-400" aria-hidden>
                      <circle cx="7" cy="7" r="2.2" />
                      <path d="M3 18l6-7 4 4.5 3-3.5 5 6" />
                    </svg>
                  )}
                </div>
                <div className="px-3.5 py-3">
                  <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                    {produto.nome}
                  </p>
                  <p className="mt-1 text-xs font-black tabular-nums text-amber-700 dark:text-amber-500">
                    {formatarReais(produto.preco_centavos)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <TabBar ativo="produtos" />
    </>
  );
}