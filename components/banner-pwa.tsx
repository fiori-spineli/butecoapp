"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function BannerPwa() {
  const [eventoPrompt, setEventoPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    function capturarPrompt(e: Event) {
      e.preventDefault();
      setEventoPrompt(e as BeforeInstallPromptEvent);
      // Exibe apenas se o usuário ainda não dispensou nesta sessão
      if (!sessionStorage.getItem("buteco_pwa_dispensado")) {
        setVisivel(true);
      }
    }

    window.addEventListener("beforeinstallprompt", capturarPrompt);
    return () => window.removeEventListener("beforeinstallprompt", capturarPrompt);
  }, []);

  async function instalar() {
    if (!eventoPrompt) return;
    await eventoPrompt.prompt();
    const escolha = await eventoPrompt.userChoice;
    if (escolha.outcome === "accepted") {
      setVisivel(false);
    }
  }

  function dispensar() {
    sessionStorage.setItem("buteco_pwa_dispensado", "true");
    setVisivel(false);
  }

  if (!visivel) return null;

  return (
    <aside
      aria-label="Instalação do aplicativo"
      className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-amber-300 dark:border-amber-900/60 bg-amber-50/95 dark:bg-amber-950/90 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 backdrop-blur-md animate-in slide-in-from-top-2"
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-700 dark:text-amber-400" aria-hidden>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
        <span className="truncate font-semibold">
          Instalar ButecoApp na tela inicial do celular
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={instalar}
          className="cursor-pointer rounded-lg bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-2.5 py-1 font-bold text-white shadow-xs transition-colors"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar aviso de instalação"
          className="cursor-pointer p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
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