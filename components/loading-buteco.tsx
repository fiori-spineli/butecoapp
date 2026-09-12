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
  // Texto fixo no primeiro render — o MESMO no servidor e no navegador.
  // Sortear aqui daria hidratação divergente: o HTML viria com uma frase e o
  // cliente montaria outra. O sorteio acontece no temporizador abaixo.
  const [frase, setFrase] = useState(fraseFixa ?? "Carregando...");

  useEffect(() => {
    // Só exibe se a requisição demorar mais do que o atraso estipulado
    const timerVisivel = setTimeout(() => {
      setVisivel(true);
      // A primeira frase sai junto com a exibição, dentro do callback: não há
      // render em cascata na montagem nem divergência com o HTML do servidor.
      if (!fraseFixa) setFrase(fraseAleatoria());
    }, atrasoMs);

    if (!fraseFixa) {
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

  // Nunca devolver null aqui.
  //
  // Este componente quase sempre SUBSTITUI o texto de um botão enquanto a ação
  // roda. Sumindo, o botão fica sem conteúdo, encolhe até o padding, e 150 ms
  // depois cresce de novo quando o spinner aparece — é o "pulo" de alguns
  // pixels que dava para ver ao registrar um pagamento na divisão da conta.
  //
  // Agora a caixa é sempre a mesma; o que muda é só a visibilidade do que está
  // dentro. O atraso continua existindo (ação rápida não pisca spinner), mas
  // agora sem mexer no layout.
  return (
    <div
      role={visivel ? "status" : undefined}
      aria-hidden={visivel ? undefined : true}
      className={`flex items-center justify-center gap-3 py-1.5 text-xs md:text-sm font-bold text-amber-900 dark:text-amber-200 ${
        visivel ? "animate-in fade-in duration-150" : "invisible"
      }`}
    >
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