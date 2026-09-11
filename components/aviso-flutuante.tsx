"use client";

import { useEffect } from "react";

/**
 * Aviso que aparece por cima da tela e some sozinho.
 *
 * Serve para botões que não têm onde escrever — o "×" de remover item, o
 * "Desfazer" do pagamento. Quando o banco recusa a operação (ver migration
 * 0013), a pessoa precisa ler o motivo; antes, o botão só parava de girar e
 * o item ficava lá, sem explicação.
 *
 * Fica acima da barra de ações da comanda (z-20) e abaixo dos modais (z-50).
 */
export function AvisoFlutuante({
  mensagem,
  aoFechar,
  duracaoMs = 6000,
}: {
  mensagem: string | null;
  aoFechar: () => void;
  duracaoMs?: number;
}) {
  useEffect(() => {
    if (!mensagem) return;
    const timer = setTimeout(aoFechar, duracaoMs);
    return () => clearTimeout(timer);
  }, [mensagem, duracaoMs, aoFechar]);

  if (!mensagem) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-40 z-40 flex justify-center px-4">
      <p
        role="alert"
        className="pointer-events-auto max-w-md rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950 px-4 py-3 text-xs font-medium text-rose-900 dark:text-rose-200 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        {mensagem}
      </p>
    </div>
  );
}
