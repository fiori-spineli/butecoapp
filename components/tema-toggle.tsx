"use client";

import { useSyncExternalStore } from "react";
import { aplicarTema } from "@/lib/tema";

/**
 * Botão de tema das telas PÚBLICAS (vitrine, contato, privacidade, login,
 * comanda do cliente). Quem tem conta ajusta o tema em Ajustes do bar —
 * ver components/seletor-de-tema.tsx.
 *
 * Quem aplica o tema salvo é o script do layout, antes da primeira pintura
 * (lib/tema.ts). Este botão só alterna e lê o estado da própria classe do
 * <html>, via useSyncExternalStore: assim ele nunca discorda do que está na
 * tela, nem quando outro controle muda o tema na mesma página.
 */

function assinar(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observador.disconnect();
}

const lerDoDom = () => document.documentElement.classList.contains("dark");
/** No servidor não há DOM; o script do layout corrige antes de aparecer. */
const lerNoServidor = () => false;

export function TemaToggle() {
  const escuro = useSyncExternalStore(assinar, lerDoDom, lerNoServidor);

  return (
    <button
      type="button"
      onClick={() => aplicarTema(escuro ? "claro" : "escuro")}
      aria-label="Alternar tema claro e escuro"
      className="cursor-pointer flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 min-h-11 min-w-11 justify-center px-0 sm:px-4 py-2.5 text-xs font-semibold text-stone-700 dark:text-stone-300 backdrop-blur-md shadow-xs transition-colors hover:border-amber-600 dark:hover:border-amber-500"
    >
      {escuro ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span className="hidden sm:inline">Modo claro</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span className="hidden sm:inline">Modo escuro</span>
        </>
      )}
    </button>
  );
}
