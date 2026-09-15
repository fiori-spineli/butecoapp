"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

type BotaoImprimirProps = {
  rotulo?: string;
  apenasIcone?: boolean;
  conteudoParaImprimir?: React.ReactNode;
  nomeArquivo?: string;
};

export function BotaoImprimir({
  rotulo = "Imprimir / Salvar PDF",
  apenasIcone = false,
  conteudoParaImprimir,
  nomeArquivo = "fechamento-buteco",
}: BotaoImprimirProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  function dispararImpressao() {
    window.print();
  }

  async function baixarPdf() {
    setGerandoPdf(true);
    try {
      const elemento = document.getElementById("conteudo-relatorio-modal");
      if (!elemento) return;

      const html2pdf = (await import("html2pdf.js")).default;
      const opcoes = {
        margin: 10,
        filename: `${nomeArquivo}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      await html2pdf().from(elemento).set(opcoes).save();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert("Não foi possível gerar o PDF. Tente usar o botão de Imprimir.");
    } finally {
      setGerandoPdf(false);
    }
  }

  function baixarDocx() {
    const elemento = document.getElementById("conteudo-relatorio-modal");
    if (!elemento) return;

    const conteudoHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${nomeArquivo}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; line-height: 1.4; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px 10px; font-size: 11pt; text-align: left; }
        th { background-color: #f2f2f2; }
        h2 { font-size: 18pt; margin-bottom: 5px; }
        h3 { font-size: 14pt; margin-top: 20px; }
        p { font-size: 11pt; margin: 4px 0; }
      </style>
      </head>
      <body>
        ${elemento.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + conteudoHtml], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nomeArquivo}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const iconeImprimir = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" rx="1" />
    </svg>
  );

  const iconePdf = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );

  const iconeDocx = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 12l2 2 4-4" />
    </svg>
  );

  // Se não houver conteúdo para a prévia, imprime direto
  if (apenasIcone && !conteudoParaImprimir) {
    return (
      <button
        type="button"
        onClick={dispararImpressao}
        aria-label={rotulo}
        title={rotulo}
        className="cursor-pointer inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
      >
        {iconeImprimir}
      </button>
    );
  }

  return (
    <>
      {apenasIcone ? (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          aria-label={rotulo}
          title={rotulo}
          className="cursor-pointer inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          {iconeImprimir}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-3 sm:px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95"
        >
          {iconeImprimir}
          {/* No celular, o texto se esconde para não engolir o cabeçalho */}
          <span className="hidden sm:inline">{rotulo}</span>
        </button>
      )}

      {modalAberto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative flex h-full sm:h-auto max-h-dvh sm:max-h-[92dvh] w-full max-w-3xl flex-col sm:rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100">
              
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
                <div>
                  <h3 className="text-sm sm:text-base font-black">Visualização e Exportação</h3>
                  <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                    Escolha se deseja exportar em PDF, Word ou imprimir diretamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="cursor-pointer rounded-full p-2 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs sm:text-sm bg-stone-50/50 dark:bg-stone-950/40">
                <div id="conteudo-relatorio-modal" className="bg-white dark:bg-stone-900 p-4 sm:p-6 rounded-2xl border border-stone-200 dark:border-stone-800">
                  {conteudoParaImprimir}
                </div>
              </div>

              {/* Botões Responsivos: Empilhados no celular, Lado a Lado no Desktop */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="order-last sm:order-first w-full sm:w-auto cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 px-5 text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                >
                  Voltar
                </button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={baixarDocx}
                    className="w-full sm:w-auto cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {iconeDocx}
                    <span className="sm:hidden">Baixar em Word</span>
                    <span className="hidden sm:inline">Salvar em Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    disabled={gerandoPdf}
                    onClick={baixarPdf}
                    className="w-full sm:w-auto cursor-pointer min-h-11 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 px-4 text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {iconePdf}
                    {gerandoPdf ? "Gerando PDF..." : "Salvar em PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalAberto(false);
                      dispararImpressao();
                    }}
                    className="w-full sm:w-auto cursor-pointer min-h-11 rounded-xl bg-amber-700 hover:bg-amber-600 px-5 text-xs sm:text-sm font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    {iconeImprimir}
                    Imprimir
                  </button>
                </div>
              </div>

            </div>
          </div>,
          document.body
        )}
    </>
  );
}