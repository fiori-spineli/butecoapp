"use client";

import { useSyncExternalStore } from "react";
import { aplicarTema, lerPreferencia, type PreferenciaDeTema } from "@/lib/tema";

/**
 * A escolha de aparência do bar, em Ajustes.
 *
 * Saiu do cabeçalho de cada tela por dois motivos. O primeiro é de uso: é uma
 * decisão que se toma UMA vez — o salão é escuro à noite ou o caixa é claro de
 * dia — e não um botão para ficar ao lado do que se usa o tempo todo. O
 * segundo é de layout: no cabeçalho ele entrava na conta do espaço e ajudava a
 * empurrar a navegação de lugar a cada tela.
 *
 * "Automático" segue o aparelho: o celular que escurece sozinho à noite leva o
 * app junto.
 */

const OPCOES: { valor: PreferenciaDeTema; rotulo: string; descricao: string }[] = [
  { valor: "claro", rotulo: "Claro", descricao: "Fundo branco, sempre." },
  { valor: "escuro", rotulo: "Escuro", descricao: "Fundo escuro, sempre." },
  { valor: "automatico", rotulo: "Automático", descricao: "Segue o aparelho." },
];

function assinar(aoMudar: () => void) {
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  window.addEventListener("storage", aoMudar);
  return () => {
    observador.disconnect();
    window.removeEventListener("storage", aoMudar);
  };
}

const lerNoServidor = (): PreferenciaDeTema => "automatico";

export function SeletorDeTema() {
  const atual = useSyncExternalStore(assinar, lerPreferencia, lerNoServidor);

  return (
    <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Aparência do aplicativo">
      {OPCOES.map((opcao) => {
        const escolhida = opcao.valor === atual;
        return (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => aplicarTema(opcao.valor)}
            aria-pressed={escolhida}
            className={`cursor-pointer rounded-2xl border p-4 text-left transition-colors ${
              escolhida
                ? "border-amber-600 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                : "border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 hover:border-stone-300 dark:hover:border-stone-700"
            }`}
          >
            <span
              className={`block text-sm font-bold ${
                escolhida
                  ? "text-amber-900 dark:text-amber-300"
                  : "text-stone-800 dark:text-stone-200"
              }`}
            >
              {opcao.rotulo}
            </span>
            <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
              {opcao.descricao}
            </span>
          </button>
        );
      })}
    </div>
  );
}
