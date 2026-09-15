"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Modo Silencioso: NÃO faz reload automático em loop.
 * Só atualiza se o dono alternar de janela e voltar para a aplicação.
 */
export function AtualizacaoAoVivo() {
  const router = useRouter();

  useEffect(() => {
    function aoVoltarParaAba() {
      // Quando o dono volta para a tela, confere suavemente sem travar a interface
      if (!document.hidden) {
        router.refresh();
      }
    }

    document.addEventListener("visibilitychange", aoVoltarParaAba);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltarParaAba);
    };
  }, [router]);

  return null;
}