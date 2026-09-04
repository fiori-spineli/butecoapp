"use client";

import { useEffect } from "react";

/** Bottom sheet simples: fecha no ESC, no backdrop e no botão. */
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="absolute inset-0 bg-stone-900/55"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative flex max-h-[86dvh] w-full max-w-md flex-col rounded-t-2xl bg-stone-100 shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-base font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            className="-m-2 rounded-full p-2 text-stone-500 hover:bg-stone-200 hover:text-stone-900"
            aria-label="Fechar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
