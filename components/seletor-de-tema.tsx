"use client";

import { useSyncExternalStore } from "react";
import { aplicarTema, lerPreferencia, type PreferenciaDeTema } from "@/lib/tema";

const OPCOES: { valor: PreferenciaDeTema; rotulo: string; descricao: string }[] = [
  { valor: "claro", rotulo: "Claro", descricao: "Fundo branco, sempre." },
  { valor: "escuro", rotulo: "Escuro", descricao: "Fundo escuro, sempre." },
  { valor: "automatico", rotulo: "Automático", descricao: "Segue o aparelho." },
];

function assinar(aoMudar: () => void) {
  window.addEventListener("buteco-tema-mudou", aoMudar);
  window.addEventListener("storage", aoMudar);
  const observador = new MutationObserver(aoMudar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => {
    window.removeEventListener("buteco-tema-mudou", aoMudar);
    window.removeEventListener("storage", aoMudar);
    observador.disconnect();
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