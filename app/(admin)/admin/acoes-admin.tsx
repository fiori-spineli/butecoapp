"use client";

import { useState, useTransition } from "react";
import { dispararManutencao } from "@/app/actions/admin";
import { LoadingButeco } from "@/components/loading-buteco";

export function AcoesAdmin() {
  const [pendente, iniciar] = useTransition();
  const [resposta, setResposta] = useState<string | null>(null);

  function executar(acao: "vacuum") {
    setResposta(null);
    iniciar(async () => {
      const res = await dispararManutencao(acao);
      if (res.ok) setResposta(res.mensagem ?? "Sucesso");
      else setResposta(`Falha: ${res.mensagem}`);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pendente}
          onClick={() => executar("vacuum")}
          className="cursor-pointer flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-xs font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Resetar estatísticas do Postgres
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