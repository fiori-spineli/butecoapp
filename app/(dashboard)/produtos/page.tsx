import Image from "next/image";
import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import { formatarReais } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
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
      <header className="flex items-center justify-between border-b border-stone-300 bg-white px-5 pt-5 pb-4">
        <h1 className="text-lg font-bold">Produtos</h1>
        <Link
          href="/produtos/novo"
          className="rounded-full bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
        >
          + Novo
        </Link>
      </header>

      <main className="flex-1 px-4 py-4">
        {produtos.length === 0 ? (
          <p className="mt-10 px-6 text-center text-sm leading-relaxed text-stone-500">
            Catálogo vazio. Cadastre os itens que mais saem — depois é só tocar neles pra
            lançar na comanda.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {produtos.map((produto) => (
              <li
                key={produto.id}
                className="overflow-hidden rounded-xl border border-stone-300 bg-white"
              >
                <div className="flex aspect-square items-center justify-center bg-stone-200">
                  {produto.imagem_url ? (
                    <Image
                      src={produto.imagem_url}
                      alt={produto.nome}
                      width={300}
                      height={300}
                      className="size-full object-cover"
                    />
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b5b2ac" strokeWidth="1.6" aria-hidden>
                      <circle cx="7" cy="7" r="2.2" />
                      <path d="M3 18l6-7 4 4.5 3-3.5 5 6" />
                    </svg>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-semibold">{produto.nome}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-stone-500">
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
