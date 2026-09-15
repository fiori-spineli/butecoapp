"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type BotaoImprimirProps = {
  rotulo?: string;
  apenasIcone?: boolean;
  conteudoParaImprimir?: React.ReactNode;
};

export function BotaoImprimir({
  rotulo = "Imprimir / Salvar PDF",
  apenasIcone = false,
  conteudoParaImprimir,
}: BotaoImprimirProps) {
  const [modalAberto, setModalAberto] = useState(false);

  function dispararImpressao() {
    const raiz = document.documentElement;
    const estavaEscuro = raiz.classList.contains("dark");
    if (estavaEscuro) raiz.classList.remove("dark");

    const restaurar = () => {
      if (estavaEscuro) raiz.classList.add("dark");
      window.removeEventListener("afterprint", restaurar);
    };
    window.addEventListener("afterprint", restaurar);

    window.print();
    setTimeout(restaurar, 1500);
  }

  const icone = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );

  return (
    <>
      {apenasIcone ? (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          aria-label={rotulo}
          title={rotulo}
          className="cursor-pointer inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          {icone}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-4 sm:px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95"
        >
          {icone}
          {rotulo}
        </button>
      )}

      {modalAberto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100">
              
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
                <div>
                  <h3 className="text-base font-black">Prévia do Fechamento</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Confira os dados na tela antes de imprimir ou salvar em PDF.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="cursor-pointer rounded-full p-2 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm bg-stone-50/50 dark:bg-stone-950/40">
                {conteudoParaImprimir}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 px-5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalAberto(false);
                    dispararImpressao();
                  }}
                  className="cursor-pointer min-h-11 rounded-xl bg-amber-700 hover:bg-amber-600 px-6 text-xs font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center gap-2"
                >
                  {icone}
                  Imprimir / Salvar PDF
                </button>
              </div>

            </div>
          </div>,
          document.body
        )}
    </>
  );
}