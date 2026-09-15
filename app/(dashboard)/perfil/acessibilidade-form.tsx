"use client";

import { useEffect, useState } from "react";

export function AcessibilidadeForm() {
  const [fonte, setFonte] = useState<"padrao" | "medio" | "grande">("padrao");
  const [contraste, setContraste] = useState(false);
  const [daltonismo, setDaltonismo] = useState<"nenhum" | "protanopia">("nenhum");

  useEffect(() => {
    const f = (localStorage.getItem("buteco_fonte") as any) || "padrao";
    const c = localStorage.getItem("buteco_contraste") === "true";
    const d = (localStorage.getItem("buteco_daltonico") as any) || "nenhum";
    setFonte(f);
    setContraste(c);
    setDaltonismo(d);
    aplicar(f, c, d);
  }, []);

  function aplicar(f: string, c: boolean, d: string) {
    document.documentElement.setAttribute("data-fonte", f);
    document.documentElement.setAttribute("data-contraste", c ? "alto" : "normal");
    document.documentElement.setAttribute("data-daltonico", d);
  }

  function mudarFonte(nova: "padrao" | "medio" | "grande") {
    setFonte(nova);
    localStorage.setItem("buteco_fonte", nova);
    aplicar(nova, contraste, daltonismo);
  }

  function alternarContraste() {
    const novo = !contraste;
    setContraste(novo);
    localStorage.setItem("buteco_contraste", String(novo));
    aplicar(fonte, novo, daltonismo);
  }

  function mudarDaltonismo(novo: "nenhum" | "protanopia") {
    setDaltonismo(novo);
    localStorage.setItem("buteco_daltonico", novo);
    aplicar(fonte, contraste, novo);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tamanho da Fonte */}
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Tamanho do Texto
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["padrao", "medio", "grande"] as const).map((tam) => (
            <button
              key={tam}
              type="button"
              onClick={() => mudarFonte(tam)}
              className={`min-h-11 rounded-xl border text-xs font-bold transition-colors ${
                fonte === tam
                  ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                  : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
              }`}
            >
              {tam === "padrao" ? "Padrão (100%)" : tam === "medio" ? "Médio (110%)" : "Grande (125%)"}
            </button>
          ))}
        </div>
      </div>

      {/* Alto Contraste e Daltonismo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
        <button
          type="button"
          onClick={alternarContraste}
          className={`min-h-11 rounded-xl border px-4 text-xs font-bold transition-colors ${
            contraste
              ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
              : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
          }`}
        >
          Alto Contraste: {contraste ? "Ativado" : "Desativado"}
        </button>

        <button
          type="button"
          onClick={() => mudarDaltonismo(daltonismo === "nenhum" ? "protanopia" : "nenhum")}
          className={`min-h-11 rounded-xl border px-4 text-xs font-bold transition-colors ${
            daltonismo !== "nenhum"
              ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
              : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
          }`}
        >
          Modo Daltônico: {daltonismo !== "nenhum" ? "Azul / Laranja" : "Desativado"}
        </button>
      </div>
    </div>
  );
}