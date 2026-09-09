"use client";

import { useTransition } from "react";
import { sair } from "@/app/actions/auth";

export function BotaoSair() {
  const [saindo, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={saindo}
      onClick={() => iniciar(async () => await sair())}
      className="cursor-pointer flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 min-h-11 px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-all disabled:opacity-50"
    >
      {saindo ? (
        <>
          <svg
            className="animate-spin size-3.5 text-amber-700 dark:text-amber-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Fechando conta...</span>
        </>
      ) : (
        <span>Sair</span>
      )}
    </button>
  );
}