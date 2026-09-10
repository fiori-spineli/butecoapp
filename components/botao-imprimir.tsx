"use client";

/**
 * Imprimir e "salvar em PDF" são o mesmo botão.
 *
 * O diálogo do navegador já traz "Salvar como PDF" como destino em todo
 * sistema atual, inclusive no Android e no iOS. Gerar o PDF por conta própria
 * exigiria carregar uma biblioteca de PDF no navegador do dono do bar, com
 * fonte e acento para resolver, para chegar num arquivo pior do que o que o
 * navegador já produz a partir do CSS de impressão.
 */
export function BotaoImprimir({ rotulo = "Imprimir / Salvar PDF" }: { rotulo?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 sm:px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
      </svg>
      {rotulo}
    </button>
  );
}
