"use client";

import { useEffect } from "react";

export function Modal({
  titulo,
  aberto,
  aoFechar,
  children,
}: {
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!aberto) return;

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") aoFechar();
    }

    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="cursor-pointer fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative flex max-h-[90dvh] md:max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl md:rounded-3xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-base md:text-lg font-black text-stone-900 dark:text-stone-100">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            className="cursor-pointer -m-2 rounded-full p-2 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            aria-label="Fechar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 text-stone-900 dark:text-stone-100">
          {children}
        </div>
      </div>
    </div>
  );
}