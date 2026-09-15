"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatarReais } from "@/lib/format";
import { atualizarEstoque } from "@/app/actions/produtos";
import type { Produto } from "@/lib/types";

export function CardProduto({ produto }: { produto: Produto }) {
  const [pendente, iniciar] = useTransition();

  function mudarEstoque(delta: number) {
    iniciar(async () => {
      await atualizarEstoque(produto.id, produto.estoque_atual + delta);
    });
  }

  return (
    <li className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 hover:border-amber-600 transition-all flex flex-col">
      <Link href={`/produtos/${produto.id}`} className="block flex-1">
        <div className="relative aspect-square mb-3 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden">
          {produto.imagem_url && (
            <Image src={produto.imagem_url} alt={produto.nome} fill className="object-cover" />
          )}
        </div>
        <h3 className="text-sm font-bold truncate">{produto.nome}</h3>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
            {produto.categoria}
          </span>
          <span className="text-sm font-black text-amber-700 dark:text-amber-500">
            {formatarReais(produto.preco_centavos)}
          </span>
        </div>
      </Link>

      {/* Ajuste Rápido de Estoque */}
      <div className="mt-3 flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
        <button
          onClick={() => mudarEstoque(-1)}
          disabled={pendente || produto.estoque_atual <= 0}
          className="cursor-pointer size-8 flex items-center justify-center font-black hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md disabled:opacity-30"
        >
          -
        </button>
        <span className="text-xs font-black tabular-nums flex-1 text-center">
          {produto.estoque_atual}
        </span>
        <button
          onClick={() => mudarEstoque(1)}
          disabled={pendente}
          className="cursor-pointer size-8 flex items-center justify-center font-black hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md disabled:opacity-30"
        >
          +
        </button>
      </div>
    </li>
  );
}