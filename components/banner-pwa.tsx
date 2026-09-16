"use client";

import { useEffect, useState } from "react";
import { ModalAlerta } from "@/components/modal-alerta";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function BannerPwa() {
  const [eventoPrompt, setEventoPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visivel, setVisivel] = useState(false);
  // `alert()` nativo TRAVA a thread principal: enquanto ele fica aberto a
  // pagina inteira para de responder, e dois toques seguidos empilham dois
  // dialogos bloqueantes. O app ja tem modal proprio (usado no login e no
  // contato) — o mesmo aqui mantem a tela viva e a aparencia igual.
  const [ajuda, setAjuda] = useState<string | null>(null);

  useEffect(() => {
    function capturarPrompt(e: Event) {
      e.preventDefault();
      setEventoPrompt(e as BeforeInstallPromptEvent);
      if (!sessionStorage.getItem("buteco_pwa_dispensado")) {
        setVisivel(true);
      }
    }

    window.addEventListener("beforeinstallprompt", capturarPrompt);

    // Fallback: se em 2 segundos o navegador não disparar o prompt automático, 
    // exibe o banner oferecendo o botão Instalar (que acionará as instruções manuais).
    const timer = setTimeout(() => {
      if (
        typeof window !== "undefined" && 
        !window.matchMedia("(display-mode: standalone)").matches && 
        !sessionStorage.getItem("buteco_pwa_dispensado")
      ) {
        setVisivel(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", capturarPrompt);
      clearTimeout(timer);
    };
  }, []);

  function mostrarAjuda() {
    setAjuda(
      "No Android (Chrome): toque nos 3 pontos e escolha 'Adicionar a tela inicial' ou 'Instalar aplicativo'.\n\n" +
        "No iPhone (Safari): toque em Compartilhar e escolha 'Adicionar a Tela de Inicio'."
    );
  }

  async function instalar() {
    if (eventoPrompt) {
      await eventoPrompt.prompt();
      const escolha = await eventoPrompt.userChoice;
      if (escolha.outcome === "accepted") {
        setVisivel(false);
      }
    } else {
      // Se não há evento nativo pronto (ex: iPhone Safari), o botão Instalar exibe as instruções.
      mostrarAjuda();
    }
  }

  function dispensar() {
    sessionStorage.setItem("buteco_pwa_dispensado", "true");
    setVisivel(false);
  }

  if (!visivel || (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches)) {
    return null;
  }

  return (
    <>
      <ModalAlerta mensagem={ajuda} titulo="Como instalar" aoFechar={() => setAjuda(null)} />

    <aside
      aria-label="Instalação do aplicativo"
      className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-amber-300 dark:border-amber-900/60 bg-amber-50/95 dark:bg-amber-950/95 px-3 sm:px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 animate-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-700 dark:text-amber-400" aria-hidden>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span className="truncate font-semibold hidden sm:inline">
          Instalar ButecoApp no celular
        </span>
        <span className="truncate font-semibold sm:hidden">
          Instalar App
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={instalar}
          className="cursor-pointer rounded-lg bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 min-h-11 px-3 sm:px-4 py-2 font-bold text-white shadow-xs transition-colors"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={mostrarAjuda}
          aria-label="Ajuda para instalar"
          className="cursor-pointer flex size-11 items-center justify-center rounded-lg border border-amber-300/80 dark:border-amber-700/80 text-amber-800 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
          title="Como instalar?"
        >
          <span className="font-black text-sm">?</span>
        </button>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Fechar aviso de instalação"
          className="cursor-pointer flex size-11 items-center justify-center text-amber-700/70 dark:text-amber-400/70 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </aside>
    </>
  );
}