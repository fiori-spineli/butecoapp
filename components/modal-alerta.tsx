"use client";

import { useEffect } from "react";

export function ModalAlerta({
  mensagem,
  titulo = "Atenção",
  aoFechar,
}: {
  mensagem: string | null | undefined;
  titulo?: string;
  aoFechar: () => void;
}) {
  useEffect(() => {
    if (!mensagem) return;

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }

    window.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [mensagem, aoFechar]);

  if (!mensagem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        className="w-full max-w-sm rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150 text-stone-900 dark:text-stone-100"
      >
        <div className="flex flex-col items-center text-center">
          {/* Ícone de Alerta */}
          <div className="mb-3.5 inline-flex size-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h3 className="text-base font-black tracking-tight">{titulo}</h3>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {mensagem}
          </p>

          <button
            type="button"
            onClick={aoFechar}
            autoFocus
            className="cursor-pointer mt-6 w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 py-3.5 text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}