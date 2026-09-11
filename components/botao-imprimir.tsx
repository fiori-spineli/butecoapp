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

/**
 * Imprime com o tema claro, seja qual for o tema da tela.
 *
 * O CSS de impressão (globals.css) já força fundo branco e texto escuro, mas
 * tirar a classe `dark` durante a impressão é a garantia de que nenhuma
 * variante `dark:` — borda, fundo de cartão, cor de rótulo — sobrevive no
 * papel. A classe volta assim que o diálogo fecha.
 */
function imprimirNoClaro() {
  const raiz = document.documentElement;
  const estavaEscuro = raiz.classList.contains("dark");
  if (estavaEscuro) raiz.classList.remove("dark");

  const restaurar = () => {
    if (estavaEscuro) raiz.classList.add("dark");
    window.removeEventListener("afterprint", restaurar);
  };
  window.addEventListener("afterprint", restaurar);

  window.print();

  // Navegador que não dispara afterprint (alguns WebKit): restaura depois que
  // o diálogo devolve o controle. No que dispara, o listener já fez o serviço.
  setTimeout(restaurar, 1500);
}

export function BotaoImprimir({
  rotulo = "Imprimir / Salvar PDF",
  apenasIcone = false,
}: {
  rotulo?: string;
  /** Só o ícone, num alvo de 44px — para cabeçalho apertado no celular. */
  apenasIcone?: boolean;
}) {
  const icone = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );

  if (apenasIcone) {
    return (
      <button
        type="button"
        onClick={imprimirNoClaro}
        aria-label={rotulo}
        title={rotulo}
        className="cursor-pointer inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
      >
        {icone}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={imprimirNoClaro}
      className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 sm:px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95"
    >
      {icone}
      {rotulo}
    </button>
  );
}
