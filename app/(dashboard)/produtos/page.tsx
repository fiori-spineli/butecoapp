import Image from "next/image";
import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import { formatarReais } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
import { CabecalhoDono } from "@/components/cabecalho-dono";
import type { Produto } from "@/lib/types";
import { AtualizacaoAoVivo } from "@/components/atualizacao-ao-vivo";

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
      <AtualizacaoAoVivo />
      <CabecalhoDono
        ativo="produtos"
        titulo="Catálogo de Produtos"
        subtitulo={`${produtos.length} item${produtos.length === 1 ? "" : "s"} cadastrado${produtos.length === 1 ? "" : "s"}`}
        acoes={
          <Link
            href="/produtos/novo"
            prefetch={true}
            className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 min-h-11 px-4 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden lg:inline">Novo produto</span>
            <span className="lg:hidden">Novo</span>
          </Link>
        }
      />

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
                className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xs hover:border-amber-600 dark:hover:border-amber-500 transition-all flex flex-col hover:-translate-y-0.5"
              >
                <Link href={`/produtos/${produto.id}`} prefetch={true} className="cursor-pointer flex flex-col flex-1">
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
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <TabBar ativo="produtos" />
    </>
  );
}