"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatarReais, formatarDataHora } from "@/lib/format";
import { TempoAberto } from "@/components/tempo-aberto";
import type { ComandaResumo } from "@/lib/types";

/**
 * O filtro tem duas posições, não três.
 *
 * "Todas" existia e vinha selecionado, o que significa que a primeira tela do
 * dia misturava a mesa que está bebendo agora com a conta paga na semana
 * passada. Quem está atrás do balcão quer ver o que está ABERTO — o resto é
 * consulta, e consulta se faz clicando.
 */
type FiltroStatus = "aberta" | "fechada";

export function ListaComandas({ comandas }: { comandas: ComandaResumo[] }) {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("aberta");

  const totais = useMemo(
    () => ({
      aberta: comandas.filter((c) => c.status === "aberta").length,
      fechada: comandas.filter((c) => c.status === "fechada").length,
    }),
    [comandas],
  );

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return comandas.filter((c) => {
      if (c.status !== filtroStatus) return false;

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

        <div
          role="tablist"
          aria-label="Filtrar comandas por situação"
          className="grid grid-cols-2 sm:flex rounded-xl bg-stone-200/70 dark:bg-stone-800 p-1 border border-stone-300 dark:border-stone-700 text-xs font-bold"
        >
          <button
            type="button"
            role="tab"
            aria-selected={filtroStatus === "aberta"}
            onClick={() => setFiltroStatus("aberta")}
            className={`cursor-pointer min-h-11 px-4 py-2.5 rounded-lg transition-all ${
              filtroStatus === "aberta"
                ? "bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            Abertas ({totais.aberta})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={filtroStatus === "fechada"}
            onClick={() => setFiltroStatus("fechada")}
            className={`cursor-pointer min-h-11 px-4 py-2.5 rounded-lg transition-all ${
              filtroStatus === "fechada"
                ? "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 shadow-xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
            }`}
          >
            Fechadas ({totais.fechada})
          </button>
        </div>
      </div>

      {/* Grade de Resultados */}
      {filtradas.length === 0 ? (
        <div className="my-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-8 text-center bg-white dark:bg-stone-900/50">
          <p className="text-sm font-bold text-stone-700 dark:text-stone-300">
            {filtroStatus === "aberta"
              ? "Nenhuma comanda aberta agora"
              : "Nenhuma comanda fechada por aqui"}
          </p>
          <p className="text-xs text-stone-400 mt-1">
            {busca
              ? "Não encontramos resultados para essa busca."
              : filtroStatus === "aberta"
                ? "Toque em Nova comanda para abrir a primeira mesa."
                : "As contas que você fechar aparecem nesta aba."}
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

      {/*
        O tempo de mesa aberta fica na linha de baixo, com o relógio contando.
        É o número que diz qual mesa está pedindo há três horas e qual foi
        aberta agora — e é o que denuncia a comanda que ninguém fechou ontem.
      */}
      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-2 text-xs text-stone-500 dark:text-stone-400">
        <span className="shrink-0">
          {comanda.itens} {comanda.itens === 1 ? "item" : "itens"}
        </span>

        {fechada ? (
          <span className="truncate">
            {comanda.fechada_em ? `Fechada ${formatarDataHora(comanda.fechada_em)}` : ""}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-semibold text-stone-600 dark:text-stone-300">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-stone-400">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <TempoAberto desde={comanda.created_at} />
          </span>
        )}
      </div>

      {comanda.pago_centavos > 0 && !fechada && (
        <p className="mt-2 text-right text-xs font-semibold text-amber-700 dark:text-amber-400">
          Restam {formatarReais(comanda.restante_centavos)}
        </p>
      )}
    </Link>
  );
}
