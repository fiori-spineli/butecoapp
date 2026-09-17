"use client";

import { useSyncExternalStore } from "react";
import { aplicarAcessibilidade, lerAcessibilidade, type ModoDaltonico, type TamanhoFonte } from "@/lib/acessibilidade";

export function AcessibilidadeForm() {
  /*
   * Estado lido do proprio <html>, nao copiado para dentro do componente.
   *
   * Antes um useEffect lia o localStorage e chamava setState tres vezes na
   * montagem. Isso custava duas coisas: uma renderizacao em cascata (o lint
   * acusava) e, pior, a tela abria SEMPRE no padrao e so depois pulava para a
   * preferencia da pessoa — quem usa fonte grande ou alto contraste via a tela
   * mudar debaixo do olho, que e exatamente quem menos deveria ver isso.
   *
   * Agora o script do layout aplica os atributos antes da primeira pintura
   * (lib/acessibilidade.ts, mesmo padrao do tema) e este componente apenas
   * observa o <html>. Fonte unica de verdade, zero piscada, zero cascata.
   */
  const estado = useSyncExternalStore(assinar, lerDoDom, lerNoServidor);
  const { fonte, contraste, daltonismo } = estado;

  function aplicar(f: TamanhoFonte, c: boolean, d: ModoDaltonico) {
    aplicarAcessibilidade({ fonte: f, contraste: c, daltonismo: d });
  }

  

  function mudarFonte(nova: TamanhoFonte) {
    aplicar(nova, contraste, daltonismo);
  }

  function alternarContraste() {
    aplicar(fonte, !contraste, daltonismo);
  }

  function mudarDaltonismo(novo: ModoDaltonico) {
    aplicar(fonte, contraste, novo);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Tamanho da Fonte */}
      <div>
        <span id="rotulo-tamanho-texto" className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Tamanho do Texto
        </span>
        <div role="group" aria-labelledby="rotulo-tamanho-texto" className="grid grid-cols-3 gap-2">
          {(["padrao", "medio", "grande"] as const).map((tam) => (
            <button
              key={tam}
              type="button"
              onClick={() => mudarFonte(tam)}
              aria-pressed={fonte === tam}
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

      {/* Alto Contraste */}
      <div>
        <button
          type="button"
          onClick={alternarContraste}
          className={`w-full min-h-11 rounded-xl border px-4 text-xs font-bold transition-colors ${
            contraste
              ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
              : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
          }`}
        >
          Modo Alto Contraste: {contraste ? "Ativado" : "Desativado"}
        </button>
      </div>

      {/* Opções de Daltonismo */}
      <div>
        <span id="rotulo-daltonismo" className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Adaptação para Daltonismo
        </span>
        <div role="group" aria-labelledby="rotulo-daltonismo" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: "nenhum", rotulo: "Padrão (Desativado)" },
            { id: "deuteranopia", rotulo: "Deuteranopia (Verde)" },
            { id: "protanopia", rotulo: "Protanopia (Vermelho)" },
            { id: "tritanopia", rotulo: "Tritanopia (Azul/Amarelo)" },
            { id: "monocromatico", rotulo: "Monocromático" },
          ].map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => mudarDaltonismo(opcao.id as ModoDaltonico)}
              aria-pressed={daltonismo === opcao.id}
              className={`min-h-11 rounded-xl border p-2.5 text-xs font-bold transition-colors text-center ${
                daltonismo === opcao.id
                  ? "border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"
                  : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300"
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function assinar(aoMudar: () => void) {
  const obs = new MutationObserver(aoMudar);
  obs.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-fonte", "data-contraste", "data-daltonico"],
  });
  return () => obs.disconnect();
}

let ultimo = { fonte: "padrao" as TamanhoFonte, contraste: false, daltonismo: "nenhum" as ModoDaltonico };

function lerDoDom() {
  const atual = lerAcessibilidade();
  // getSnapshot precisa devolver a MESMA referencia quando nada mudou, senao
  // o React entra em laco de renderizacao.
  if (
    atual.fonte !== ultimo.fonte ||
    atual.contraste !== ultimo.contraste ||
    atual.daltonismo !== ultimo.daltonismo
  ) {
    ultimo = atual;
  }
  return ultimo;
}

function lerNoServidor() {
  return { fonte: "padrao" as TamanhoFonte, contraste: false, daltonismo: "nenhum" as ModoDaltonico };
}
