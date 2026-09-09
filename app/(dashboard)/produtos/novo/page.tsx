import Image from "next/image";
import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import { formatarReais } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
import { TemaToggle } from "@/components/tema-toggle";
import type { Produto } from "@/lib/types";

export default async function ProdutosPage() {
  const { supabase, bar } = await exigirBar();

  const { data } = await supabase
    .from("produtos")
    .select("id, nome, preco_centavos, imagem_url")
    .eq("bar_id", bar.id)
    .order("nome");

  const produtos = (data ?? []) as Produto[];

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-200">
      <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4">
        <div>
          <h1 className="text-lg md:text-2xl font-black text-stone-900 dark:text-stone-100">
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
            prefetch={true}
            className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo produto
          </Link>
        </div>
      </header>

      <main className="flex-1 p-6">
        {produtos.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900/50">
            <p className="text-base font-bold text-stone-800 dark:text-stone-200">
              Catálogo vazio
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Cadastre seus produtos para lançar em 1 toque na comanda.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {produtos.map((produto) => (
              <li
                key={produto.id}
                className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs hover:border-amber-600 dark:hover:border-amber-500 transition-all flex flex-col hover:-translate-y-0.5"
              >
                <div className="relative flex aspect-square items-center justify-center bg-stone-100 dark:bg-stone-800/80">
                  {produto.imagem_url ? (
                    <Image
                      src={produto.imagem_url}
                      alt={produto.nome}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      className="size-full object-cover"
                    />
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-stone-400" aria-hidden>
                      <circle cx="7" cy="7" r="2.2" />
                      <path d="M3 18l6-7 4 4.5 3-3.5 5 6" />
                    </svg>
                  )}
                </div>
                <div className="p-4 flex flex-col justify-between flex-1">
                  <h3 className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                    {produto.nome}
                  </h3>
                  <p className="mt-1 text-sm font-black tabular-nums text-amber-700 dark:text-amber-500">
                    {formatarReais(produto.preco_centavos)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <TabBar ativo="produtos" />
    </div>
  );
}