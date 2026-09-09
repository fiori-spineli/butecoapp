"use client";

import { useEffect, useState } from "react";

export function TemaToggle() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const salvo = localStorage.getItem("buteco_tema");
    const prefere = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const deveSerEscuro = salvo === "dark" || (!salvo && prefere);

    if (deveSerEscuro) {
      document.documentElement.classList.add("dark");
      setEscuro(true);
    } else {
      document.documentElement.classList.remove("dark");
      setEscuro(false);
    }
  }, []);

  function alternar() {
    if (escuro) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("buteco_tema", "light");
      setEscuro(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("buteco_tema", "dark");
      setEscuro(true);
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Alternar tema claro e escuro"
      className="cursor-pointer flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 min-h-11 px-4 py-2.5 text-xs font-semibold text-stone-700 dark:text-stone-300 backdrop-blur-md shadow-xs transition-colors hover:border-amber-600 dark:hover:border-amber-500"
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
          Modo claro
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          Modo escuro
        </>
      )}
    </button>
  );
}