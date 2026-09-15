import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import { TabBar } from "@/components/tab-bar";
import { CabecalhoDono } from "@/components/cabecalho-dono";
import { AtualizacaoAoVivo } from "@/components/atualizacao-ao-vivo";
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
      <AtualizacaoAoVivo />
      <CabecalhoDono
        ativo="produtos"
        acoes={
          <Link
            href="/produtos/novo"
            className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center gap-2"
          >
            Novo produto
          </Link>
        }
      />

      <main className="flex-1 px-6 py-6">
        <div className="flex justify-between items-end mb-6">
           <span className="text-xs text-stone-400 font-medium">{produtos.length} items cadastrados</span>
        </div>

        {produtos.length === 0 ? (
          <div className="text-center p-10 text-stone-500">Nenhum produto cadastrado.</div>
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