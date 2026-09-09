"use client";

import { useTransition } from "react";
import {
  fecharConta,
  reabrirConta,
  removerLancamento,
  removerPagamento,
} from "@/app/actions/comandas";

export function BotaoFecharConta({
  clienteId,
  contaAberta,
}: {
  clienteId: string;
  contaAberta: boolean;
}) {
  const [processando, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={processando}
      onClick={() =>
        iniciar(async () => {
          if (contaAberta) await fecharConta(clienteId);
          else await reabrirConta(clienteId);
        })
      }
      className="cursor-pointer shrink-0 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
    >
      {contaAberta ? "Fechar conta" : "Reabrir conta"}
    </button>
  );
}

export function BotaoRemoverItem({
  clienteId,
  lancamentoId,
  nome,
}: {
  clienteId: string;
  lancamentoId: string;
  nome: string;
}) {
  const [processando, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={processando}
      aria-label={`Remover ${nome} da conta`}
      onClick={() => iniciar(async () => void (await removerLancamento(clienteId, lancamentoId)))}
      className="cursor-pointer -m-1.5 shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-rose-600 transition-colors disabled:opacity-40"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

export function BotaoDesfazerPagamento({
  clienteId,
  pagamentoId,
}: {
  clienteId: string;
  pagamentoId: string;
}) {
  const [processando, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={processando}
      onClick={() => iniciar(async () => void (await removerPagamento(clienteId, pagamentoId)))}
      className="cursor-pointer text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-40"
    >
      Desfazer
    </button>
  );
}