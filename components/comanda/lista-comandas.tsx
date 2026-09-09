"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatarReais } from "@/lib/format";
import type { ComandaResumo } from "@/lib/types";

export function ListaComandas({ comandas }: { comandas: ComandaResumo[] }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "aberta" | "fechada">("todas");

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return comandas.filter((c) => {
      const bateStatus = filtroStatus === "todas" ? true : c.status === filtroStatus;
      if (!bateStatus) return false;

      if (!termo) return true;
      const nomeBate = c.nome.toLowerCase().includes(termo);
      const mesaBate = c.numero_mesa ? c.numero_mesa.toLowerCase().includes(termo) : false;
      return nomeBate || mesaBate;
    });
  }, [comandas, busca, filtroStatus]);

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="flex-1 flex items-center gap-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 py-2.5 text-stone-900 dark:text-stone-100 shadow-xs focus-within:border-amber-600 dark:focus-within:border-amber-500 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400 shrink-0" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou número da mesa..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
              className="cursor-pointer text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </label>

        <div className="flex rounded-xl bg-stone-200/70 dark:bg-stone-800 p-1 border border-stone-300 dark:border-stone-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => setFiltroStatus("todas")}
            className={`cursor-pointer min-h-11 px-4 py-2.5 rounded-lg transition-all ${
              filtroStatus === "todas"
                ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            Todas ({comandas.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus("aberta")}
            className={`cursor-pointer min-h-11 px-4 py-2.5 rounded-lg transition-all ${
              filtroStatus === "aberta"
                ? "bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            Abertas
          </button>
          <button
            type="button"
            onClick={() => setFiltroStatus("fechada")}
            className={`cursor-pointer min-h-11 px-4 py-2.5 rounded-lg transition-all ${
              filtroStatus === "fechada"
                ? "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 shadow-xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            Fechadas
          </button>
        </div>
      </div>

      {/* Grade de Resultados */}
      {filtradas.length === 0 ? (
        <div className="my-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-8 text-center bg-white dark:bg-stone-900/50">
          <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
            Nenhuma comanda encontrada
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Não encontramos resultados para os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map((comanda) => (
            <LinhaComanda key={comanda.id} comanda={comanda} />
          ))}
        </div>
      )}
    </div>
  );
}

function LinhaComanda({ comanda }: { comanda: ComandaResumo }) {
  const fechada = comanda.status === "fechada";

  return (
    <Link
      href={`/comanda/${comanda.id}`}
      prefetch={true}
      className={`cursor-pointer flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 hover:border-amber-600 dark:hover:border-amber-500 transition-all shadow-xs active:scale-[0.99] ${
        fechada ? "opacity-60 bg-stone-50 dark:bg-stone-900/60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full shrink-0 ${
                fechada ? "bg-stone-300 dark:bg-stone-700" : "bg-emerald-600 dark:bg-emerald-500"
              }`}
            />
            <h3 className="truncate font-bold text-base text-stone-900 dark:text-stone-100">
              {comanda.nome}
            </h3>
          </div>
          {comanda.numero_mesa && (
            <span className="mt-2 inline-block rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
              Mesa {comanda.numero_mesa}
            </span>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-black tabular-nums text-stone-900 dark:text-stone-100">
            {formatarReais(comanda.total_centavos)}
          </p>
          <span className="text-xs text-stone-400">
            {fechada ? "Encerrada" : comanda.pago_centavos > 0 ? "Parcialmente paga" : "Em aberto"}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
        <span>
          {comanda.itens} {comanda.itens === 1 ? "item" : "itens"}
        </span>
        {comanda.pago_centavos > 0 && !fechada && (
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            Restam {formatarReais(comanda.restante_centavos)}
          </span>
        )}
      </div>
    </Link>
  );
}