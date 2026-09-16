"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatarReais } from "@/lib/format";
import { ajustarEstoque } from "@/app/actions/produtos";
import type { Produto } from "@/lib/types";

export function CardProduto({ produto }: { produto: Produto }) {
  /**
   * Estoque com resposta imediata e uma gravacao so.
   *
   * Antes cada toque disparava uma gravacao e desabilitava o botao ate ela
   * voltar — entao quem tocava rapido perdia a maioria dos toques (medido: 30
   * toques moveram o estoque de 2 para 4). Agora o numero na tela muda na
   * hora e o total acumulado e enviado UMA vez, meio segundo depois do ultimo
   * toque. Dez toques viram "+10" numa chamada, nao dez chamadas.
   *
   * O envio e por DELTA: quem soma e o banco (migration 0022), entao dois
   * aparelhos ajustando o mesmo produto nao apagam o ajuste um do outro.
   */
  const [estoque, setEstoque] = useState(produto.estoque_atual);
  const pendenteRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O servidor e a verdade: quando a revalidacao traz um valor novo e nao ha
  // toque esperando para ser enviado, a tela acompanha (inclusive ajuste feito
  // no outro aparelho).
  useEffect(() => {
    if (pendenteRef.current === 0) setEstoque(produto.estoque_atual);
  }, [produto.estoque_atual]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function mudarEstoque(delta: number) {
    setEstoque((atual) => Math.max(0, atual + delta));
    pendenteRef.current += delta;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const acumulado = pendenteRef.current;
      pendenteRef.current = 0;
      if (acumulado === 0) return;

      const r = await ajustarEstoque(produto.id, acumulado);
      // Recusa do servidor desfaz o otimismo em vez de deixar numero mentiroso.
      if (!r.ok) setEstoque((atual) => Math.max(0, atual - acumulado));
      else if (typeof r.estoque === "number") setEstoque(r.estoque);
    }, 500);
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
          aria-label="Tirar uma unidade do estoque"
          disabled={estoque <= 0}
          className="cursor-pointer size-11 flex items-center justify-center font-black hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md disabled:opacity-30"
        >
          -
        </button>
        <span className="text-xs font-black tabular-nums flex-1 text-center">
          {estoque}
        </span>
        <button
          onClick={() => mudarEstoque(1)}
          aria-label="Somar uma unidade ao estoque"
          className="cursor-pointer size-11 flex items-center justify-center font-black hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md disabled:opacity-30"
        >
          +
        </button>
      </div>
    </li>
  );
}