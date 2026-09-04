"use client";

import { useState, useTransition } from "react";
import { Modal } from "./modal";
import { formatarReais, parseReaisParaCentavos } from "@/lib/format";
import { registrarPagamento, registrarPagamentoDeItem } from "@/app/actions/comandas";

export type ItemDivisivel = {
  id: string;
  nome: string;
  quantidade: number;
  pagas: number;
  valor_unitario_centavos: number;
};

/**
 * Duas formas de abater a conta, sobre a mesma tabela de pagamentos:
 * divisão igualitária (pagamento avulso) e pagamento parcial por item.
 * Nenhum dinheiro passa pelo app — isto é só o registro do que já foi acertado.
 */
export function DividirConta({
  clienteId,
  totalCentavos,
  restanteCentavos,
  itens,
  aberto,
  aoFechar,
}: {
  clienteId: string;
  totalCentavos: number;
  restanteCentavos: number;
  itens: ItemDivisivel[];
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [pessoas, setPessoas] = useState(2);
  const [valorLivre, setValorLivre] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  const porPessoa = pessoas > 0 ? Math.floor(restanteCentavos / pessoas) : 0;
  const sobra = restanteCentavos - porPessoa * pessoas;

  function executar(acao: () => Promise<{ ok: boolean; mensagem?: string }>) {
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (!resultado.ok) setErro(resultado.mensagem ?? "Não consegui registrar.");
    });
  }

  return (
    <Modal titulo="Dividir conta" aberto={aberto} aoFechar={aoFechar}>
      <div className="rounded-xl border border-stone-300 bg-white p-4">
        <p className="mb-3 text-sm font-bold">Divisão igual</p>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-stone-500">Quantas pessoas?</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menos uma pessoa"
              onClick={() => setPessoas((n) => Math.max(1, n - 1))}
              className="size-11 rounded-lg border border-stone-900 text-lg font-bold"
            >
              –
            </button>
            <span className="min-w-5 text-center font-bold tabular-nums">{pessoas}</span>
            <button
              type="button"
              aria-label="Mais uma pessoa"
              onClick={() => setPessoas((n) => Math.min(30, n + 1))}
              className="size-11 rounded-lg border border-stone-900 text-lg font-bold"
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-stone-200 py-3 text-center">
          <p className="text-xl font-bold tabular-nums">{formatarReais(porPessoa)}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            por pessoa
          </p>
        </div>

        {sobra > 0 ? (
          <p className="mt-2 text-center text-xs text-stone-500">
            Sobram {formatarReais(sobra)} — alguém paga essa diferença no fim.
          </p>
        ) : null}

        <button
          type="button"
          disabled={processando || porPessoa <= 0}
          onClick={() =>
            executar(() =>
              registrarPagamento(clienteId, porPessoa, `divisão igualitária entre ${pessoas}`),
            )
          }
          className="mt-3 w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          Registrar uma parte paga ({formatarReais(porPessoa)})
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-stone-300 bg-white p-4">
        <p className="mb-3 text-sm font-bold">Pagamento por item</p>

        {itens.length === 0 ? (
          <p className="py-2 text-center text-sm text-stone-500">Nenhum item lançado ainda.</p>
        ) : (
          <ul className="flex flex-col">
            {itens.map((item) => {
              const restantes = item.quantidade - item.pagas;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 border-t border-stone-200 py-2.5 first:border-t-0 first:pt-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.nome}</p>
                    <p className="text-[11px] text-stone-400">
                      {item.pagas} de {item.quantidade} pagas ·{" "}
                      {formatarReais(item.valor_unitario_centavos)} cada
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Marcar uma unidade de ${item.nome} como paga`}
                    disabled={processando || restantes <= 0}
                    onClick={() =>
                      executar(() => registrarPagamentoDeItem(clienteId, item.id, 1))
                    }
                    className="size-11 shrink-0 rounded-lg border border-stone-900 text-lg font-bold disabled:border-stone-300 disabled:text-stone-300"
                  >
                    +
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-stone-300 bg-white p-4">
        <p className="mb-3 text-sm font-bold">Outro valor</p>
        <div className="flex gap-2">
          <input
            value={valorLivre}
            onChange={(evento) => setValorLivre(evento.target.value)}
            inputMode="decimal"
            placeholder="Ex: 37,50"
            aria-label="Valor pago"
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-stone-900"
          />
          <button
            type="button"
            disabled={processando}
            onClick={() => {
              const centavos = parseReaisParaCentavos(valorLivre);
              if (centavos === null || centavos <= 0) {
                setErro("Digite um valor válido.");
                return;
              }
              executar(async () => {
                const resultado = await registrarPagamento(clienteId, centavos, "pagamento avulso");
                if (resultado.ok) setValorLivre("");
                return resultado;
              });
            }}
            className="shrink-0 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Registrar
          </button>
        </div>
      </div>

      {erro ? (
        <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {erro}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-300 bg-white px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Restante da conta
        </span>
        <span className="text-lg font-bold tabular-nums">{formatarReais(restanteCentavos)}</span>
      </div>

      <p className="mt-2 text-center text-[11px] leading-relaxed text-stone-400">
        Total da conta: {formatarReais(totalCentavos)}. O dinheiro é acertado fora do app —
        aqui só fica o registro.
      </p>
    </Modal>
  );
}
