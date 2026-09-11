"use client";

import { useState, useTransition } from "react";
import { dispararManutencao, limparFotosOrfas } from "@/app/actions/admin";
import { LoadingButeco } from "@/components/loading-buteco";

export function AcoesAdmin() {
  const [pendente, iniciar] = useTransition();
  const [resposta, setResposta] = useState<string | null>(null);

  function executar(acao: "analisar" | "fotos") {
    setResposta(null);
    iniciar(async () => {
      const res = acao === "fotos" ? await limparFotosOrfas() : await dispararManutencao(acao);
      if (res.ok) setResposta(res.mensagem ?? "Sucesso");
      else setResposta(`Falha: ${res.mensagem}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pendente}
          onClick={() => executar("analisar")}
          className="cursor-pointer flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-xs font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Recalcular estatísticas do planejador
        </button>
        <button
          type="button"
          disabled={pendente}
          onClick={() => executar("fotos")}
          className="cursor-pointer flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-xs font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          Limpar fotos sem produto
        </button>
      </div>

      {pendente && <LoadingButeco fraseFixa="Executando comando no servidor..." />}
      {resposta && (
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {resposta}
        </p>
      )}
    </div>
  );
}