"use client";

import { useTransition } from "react";
import { confirmarEntrega, recusarPedido } from "@/app/actions/pedidos";
import { formatarMomento, formatarReais } from "@/lib/format";

export type PedidoPendenteDono = {
  id: string;
  cliente_id: string;
  quantidade: number;
  valor_unitario_centavos: number;
  created_at: string;
  produtos: { nome: string } | null;
};

export function PedidosPendentesAlerta({
  pedidos,
  clienteId,
}: {
  pedidos: PedidoPendenteDono[];
  clienteId: string;
}) {
  const [pendente, iniciar] = useTransition();

  if (!pedidos || pedidos.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5 shadow-md">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="flex size-3 rounded-full bg-amber-500 animate-ping" />
        <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
          Atenção: {pedidos.length} Pedido{pedidos.length > 1 ? "s" : ""} Solicitado{pedidos.length > 1 ? "s" : ""} pelo Cliente
        </h2>
      </div>

      <p className="text-xs text-amber-800 dark:text-amber-400 mb-4">
        O cliente adicionou estes itens pelo QR Code. Confirme após entregar na mesa para lançar oficialmente na comanda:
      </p>

      <ul className="divide-y divide-amber-200 dark:divide-amber-900/60 rounded-xl bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800/80 overflow-hidden">
        {pedidos.map((p) => {
          const nome = p.produtos?.nome || "Produto";
          return (
            <li
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-stone-900 dark:text-stone-100">
                  {p.quantidade}x {nome}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {formatarMomento(p.created_at)} • {formatarReais(p.quantidade * p.valor_unitario_centavos)}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => {
                    iniciar(async () => {
                      await recusarPedido(p.id, clienteId);
                    });
                  }}
                  className="cursor-pointer min-h-10 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 px-3.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  Recusar
                </button>
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => {
                    iniciar(async () => {
                      await confirmarEntrega(p.id, clienteId);
                    });
                  }}
                  className="cursor-pointer min-h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 text-xs font-bold text-white shadow-xs transition-transform active:scale-95 disabled:opacity-50"
                >
                  Confirmar Entrega
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}