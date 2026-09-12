"use client";

import { useState, useTransition } from "react";
import { Modal } from "./modal";
import { formatarReais, parseReaisParaCentavos } from "@/lib/format";
import { registrarPagamento, registrarPagamentoDeItem } from "@/app/actions/comandas";
import { LoadingButeco } from "@/components/loading-buteco";

export type ItemDivisivel = {
  id: string;
  nome: string;
  quantidade: number;
  pagas: number;
  valor_unitario_centavos: number;
};

type AbaDivisao = "exata" | "especifica" | "item";

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
  const [aba, setAba] = useState<AbaDivisao>("exata");
  const [pessoas, setPessoas] = useState(2);
  const [valorEspecifico, setValorEspecifico] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  // Cálculo da divisão exata por pessoas
  const porPessoa = pessoas > 0 ? Math.floor(restanteCentavos / pessoas) : 0;
  const sobraCentavos = restanteCentavos - porPessoa * pessoas;

  function executar(acao: () => Promise<{ ok: boolean; mensagem?: string }>) {
    setErro(null);
    iniciar(async () => {
      const resultado = await acao();
      if (!resultado.ok) setErro(resultado.mensagem ?? "Não consegui registrar o acerto.");
      else {
        setValorEspecifico("");
      }
    });
  }

  return (
    <Modal titulo="Acertar ou Dividir Conta" aberto={aberto} aoFechar={aoFechar}>
      {/* Resumo do Saldo no Topo do Modal */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-800/50 px-4 py-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Total da conta
          </span>
          <p className="text-sm font-black tabular-nums text-stone-700 dark:text-stone-300">
            {formatarReais(totalCentavos)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Restante a pagar
          </span>
          <p className="text-lg font-black tabular-nums text-amber-700 dark:text-amber-400">
            {formatarReais(restanteCentavos)}
          </p>
        </div>
      </div>

      {/* Abas com as 3 Formas de Pagamento */}
      <div className="grid grid-cols-3 rounded-xl bg-stone-200/70 dark:bg-stone-800 p-1 border border-stone-300 dark:border-stone-700 mb-5">
        <button
          type="button"
          onClick={() => setAba("exata")}
          className={`cursor-pointer py-2 text-xs font-bold rounded-lg transition-all text-center ${
            aba === "exata"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          Dividir igual
        </button>
        <button
          type="button"
          onClick={() => setAba("especifica")}
          className={`cursor-pointer py-2 text-xs font-bold rounded-lg transition-all text-center ${
            aba === "especifica"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          Valor avulso
        </button>
        <button
          type="button"
          onClick={() => setAba("item")}
          className={`cursor-pointer py-2 text-xs font-bold rounded-lg transition-all text-center ${
            aba === "item"
              ? "bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs"
              : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          Por produto
        </button>
      </div>

      {/* 1. ABA: DIVISÃO IGUAL POR N PESSOAS */}
      {aba === "exata" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/70 p-4">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Número de pessoas
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPessoas((n) => Math.max(1, n - 1))}
                className="cursor-pointer size-10 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-base font-black text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center"
              >
                -
              </button>
              <span className="min-w-6 text-center text-base font-black tabular-nums text-stone-900 dark:text-stone-100">
                {pessoas}
              </span>
              <button
                type="button"
                onClick={() => setPessoas((n) => Math.min(50, n + 1))}
                className="cursor-pointer size-10 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-base font-black text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-amber-50/50 dark:bg-amber-950/20 p-5 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Valor por pessoa
            </span>
            <p className="mt-1 text-3xl font-black tabular-nums text-amber-800 dark:text-amber-400">
              {formatarReais(porPessoa)}
            </p>
            {sobraCentavos > 0 && (
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                Diferença de arredondamento: {formatarReais(sobraCentavos)} (alguém acerta no fim).
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={processando || porPessoa <= 0}
            onClick={() =>
              executar(() =>
                registrarPagamento(clienteId, porPessoa, `Parte paga (1 de ${pessoas} pessoas)`),
              )
            }
            className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 p-4 font-bold text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {processando ? <LoadingButeco /> : `Registrar 1 parte de ${formatarReais(porPessoa)}`}
          </button>
        </div>
      )}

      {/* 2. ABA: VALOR ESPECÍFICO / ABATIMENTO LIVRE */}
      {aba === "especifica" && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
              Quanto o cliente está pagando agora?
            </label>
            <input
              value={valorEspecifico}
              onChange={(e) => setValorEspecifico(e.target.value)}
              inputMode="decimal"
              placeholder="Ex: 50,00 ou 23,40"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-base font-black tabular-nums text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 transition-colors"
            />
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
              Pode ser qualquer quantia em dinheiro, Pix ou cartão acertada fora do aplicativo.
            </p>
          </div>

          <button
            type="button"
            disabled={processando || !valorEspecifico.trim()}
            onClick={() => {
              const centavos = parseReaisParaCentavos(valorEspecifico);
              if (centavos === null) {
                setErro("Valor inválido. Use vírgula para os centavos, como 12,50.");
                return;
              }
              if (centavos <= 0) {
                setErro("O valor precisa ser maior que zero.");
                return;
              }
              if (centavos > restanteCentavos) {
                setErro(
                  `Falta só ${formatarReais(restanteCentavos)} nesta conta — o abatimento não pode passar disso.`,
                );
                return;
              }
              executar(async () => {
                const res = await registrarPagamento(clienteId, centavos, "Abatimento avulso");
                return res;
              });
            }}
            className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 p-4 font-bold text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {processando ? <LoadingButeco /> : "Registrar abatimento de valor"}
          </button>
        </div>
      )}

      {/* 3. ABA: PAGAMENTO POR ITEM */}
      {aba === "item" && (
        <div className="flex flex-col gap-3">
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Marque os itens que o cliente consumiu e pagou:
          </span>

          {itens.length === 0 ? (
            <p className="py-8 text-center text-xs text-stone-500 dark:text-stone-400">
              Nenhum item lançado nessa comanda.
            </p>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/50 max-h-[38vh] overflow-y-auto">
              {itens.map((item) => {
                const restantes = item.quantidade - item.pagas;

                // Duas contagens diferentes precisam bater. Um pagamento de
                // valor livre abate o total sem marcar unidade nenhuma, então
                // um item pode ter unidade "em aberto" e mesmo assim não caber
                // no que falta da conta. Deixar clicar aqui levaria a conta
                // para saldo negativo — o servidor recusa, mas o botão não
                // deve nem oferecer.
                const cabeNoSaldo = item.valor_unitario_centavos <= restanteCentavos;
                const bloqueado = processando || restantes <= 0 || !cabeNoSaldo;

                return (
                  <li key={item.id} className="flex items-center justify-between p-3.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                        {item.nome}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {item.pagas} de {item.quantidade} pagas &bull;{" "}
                        {formatarReais(item.valor_unitario_centavos)} cada
                      </p>
                      {restantes > 0 && !cabeNoSaldo && (
                        <p className="mt-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-500">
                          Já coberto por pagamento avulso
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={bloqueado}
                      onClick={() =>
                        executar(() => registrarPagamentoDeItem(clienteId, item.id, 1))
                      }
                      className="cursor-pointer shrink-0 rounded-xl border border-amber-700 dark:border-amber-600 bg-amber-700 dark:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 dark:hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      Pagar 1 un.
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {erro && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs text-rose-900 dark:text-rose-200">
          {erro}
        </p>
      )}

      <p className="mt-5 text-center text-[11px] text-stone-400 dark:text-stone-500">
        Nenhum dinheiro transita pelo app. Isso é apenas o controle contábil do bar.
      </p>
    </Modal>
  );
}