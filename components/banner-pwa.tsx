"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function BannerPwa() {
  const [eventoPrompt, setEventoPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visivel, setVisivel] = useState(false);
  const [manual, setManual] = useState(false);

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
    // exibe o banner educativo ensinando a instalar pelo menu do 3 pontinhos do Chrome/Samsung.
    const timer = setTimeout(() => {
      if (!window.matchMedia("(display-mode: standalone)").matches && !sessionStorage.getItem("buteco_pwa_dispensado")) {
        setVisivel(true);
        setManual(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", capturarPrompt);
      clearTimeout(timer);
    };
  }, []);

  async function instalar() {
    if (eventoPrompt) {
      await eventoPrompt.prompt();
      const escolha = await eventoPrompt.userChoice;
      if (escolha.outcome === "accepted") {
        setVisivel(false);
      }
    } else {
      alert("Para instalar: toque no menu de 3 pontos do seu navegador e escolha 'Adicionar à tela inicial' ou 'Instalar aplicativo'.");
    }
  }

  function dispensar() {
    sessionStorage.setItem("buteco_pwa_dispensado", "true");
    setVisivel(false);
  }

  if (!visivel || window.matchMedia("(display-mode: standalone)").matches) return null;

  return (
    <aside
      aria-label="Instalação do aplicativo"
      className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-amber-300 dark:border-amber-900/60 bg-amber-50/95 dark:bg-amber-950/95 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 animate-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-700 dark:text-amber-400" aria-hidden>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span className="truncate font-semibold">
          {manual ? "Instalar ButecoApp no celular" : "Instalar ButecoApp na tela inicial"}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={instalar}
          className="cursor-pointer rounded-lg bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 min-h-11 px-3.5 py-2 font-bold text-white shadow-xs transition-colors"
        >
          {manual ? "Como instalar?" : "Instalar"}
        </button>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar aviso de instalação"
          className="cursor-pointer flex size-11 items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </aside>
  );
}