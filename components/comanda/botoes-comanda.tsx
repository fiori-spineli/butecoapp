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
      className="shrink-0 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 disabled:opacity-50"
    >
      {contaAberta ? "Fechar conta" : "Reabrir"}
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
      className="-m-2 shrink-0 rounded-full p-2 text-stone-300 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
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
      className="shrink-0 text-xs font-semibold text-stone-400 underline underline-offset-2 hover:text-stone-900 disabled:opacity-40"
    >
      desfazer
    </button>
  );
}
