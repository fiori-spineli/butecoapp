"use client";

import { useEffect, useState } from "react";
import { fraseAleatoria } from "@/lib/buteco-loading";

export function LoadingButeco({
  fraseFixa,
  atrasoMs = 150,
}: {
  fraseFixa?: string;
  atrasoMs?: number;
}) {
  const [visivel, setVisivel] = useState(false);
  const [frase, setFrase] = useState(fraseFixa ?? "Carregando...");

  useEffect(() => {
    // Só exibe se a requisição demorar mais do que o atraso estipulado
    const timerVisivel = setTimeout(() => {
      setVisivel(true);
    }, atrasoMs);

    if (!fraseFixa) {
      setFrase(fraseAleatoria());
      const intervalo = setInterval(() => {
        setFrase(fraseAleatoria());
      }, 2000);
      return () => {
        clearTimeout(timerVisivel);
        clearInterval(intervalo);
      };
    }

    return () => clearTimeout(timerVisivel);
  }, [fraseFixa, atrasoMs]);

  if (!visivel) return null;

  return (
    <div className="flex items-center justify-center gap-3 py-1.5 text-xs md:text-sm font-bold text-amber-900 dark:text-amber-200 animate-in fade-in duration-150">
      <svg
        className="animate-spin size-4 md:size-5 shrink-0 text-amber-700 dark:text-amber-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="truncate tracking-wide">{frase}</span>
    </div>
  );
}