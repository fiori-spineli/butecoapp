"use client";

import { useCallback, useState, useTransition } from "react";
import {
  fecharConta,
  reabrirConta,
  removerLancamento,
  removerPagamento,
  type Resultado,
} from "@/app/actions/comandas";
import { formatarReais } from "@/lib/format";
import { LoadingButeco } from "@/components/loading-buteco";
import { AvisoFlutuante } from "@/components/aviso-flutuante";

/**
 * As três ações abaixo (fechar, remover item, desfazer pagamento) podem ser
 * recusadas pelo banco — comanda fechada, item já coberto por pagamento. A
 * recusa vem como `{ ok: false, mensagem }`, e a mensagem precisa aparecer:
 * botão que só para de girar deixa a pessoa achando que o app travou.
 */
function useAvisoDeRecusa() {
  const [aviso, setAviso] = useState<string | null>(null);
  const limpar = useCallback(() => setAviso(null), []);
  const registrar = useCallback((resultado: Resultado) => {
    setAviso(resultado.ok ? null : (resultado.mensagem ?? "Não consegui concluir. Tente de novo."));
  }, []);
  return { aviso, limpar, registrar };
}

export function BotaoFecharConta({
  clienteId,
  contaAberta,
  restanteCentavos = 0,
}: {
  clienteId: string;
  contaAberta: boolean;
  restanteCentavos?: number;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [processando, iniciar] = useTransition();
  const { aviso, limpar, registrar } = useAvisoDeRecusa();

  function executarEncerramento() {
    iniciar(async () => {
      registrar(await fecharConta(clienteId));
      setConfirmando(false);
    });
  }

  function clicar() {
    if (contaAberta && restanteCentavos > 0) {
      setConfirmando(true);
    } else if (contaAberta) {
      iniciar(async () => {
        registrar(await fecharConta(clienteId));
      });
    } else {
      iniciar(async () => {
        registrar(await reabrirConta(clienteId));
      });
    }
  }

  return (
    <>
      <AvisoFlutuante mensagem={aviso} aoFechar={limpar} />
      <button
        type="button"
        disabled={processando}
        onClick={clicar}
        className="cursor-pointer shrink-0 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
      >
        {processando ? "Atualizando..." : contaAberta ? "Fechar conta" : "Reabrir conta"}
      </button>

      {/* Modal de Confirmação quando há saldo devedor */}
      {confirmando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
              Confirmar fechamento de conta?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              Ainda resta um saldo devedor de{" "}
              <strong className="text-amber-700 dark:text-amber-400">
                {formatarReais(restanteCentavos)}
              </strong>
              . Fechar a conta registrará o recebimento integral desse saldo.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={processando}
                onClick={() => setConfirmando(false)}
                className="cursor-pointer flex-1 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={processando}
                onClick={executarEncerramento}
                className="cursor-pointer flex-1 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 py-2.5 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {processando ? <LoadingButeco /> : "Confirmar e fechar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
  const { aviso, limpar, registrar } = useAvisoDeRecusa();

  return (
    <>
      <AvisoFlutuante mensagem={aviso} aoFechar={limpar} />
      <button
        type="button"
        disabled={processando}
        aria-label={`Remover ${nome} da conta`}
        onClick={() =>
          iniciar(async () => {
            registrar(await removerLancamento(clienteId, lancamentoId));
          })
        }
        className="cursor-pointer -m-1.5 shrink-0 rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-rose-600 transition-colors disabled:opacity-40"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </>
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
  const { aviso, limpar, registrar } = useAvisoDeRecusa();

  return (
    <>
      <AvisoFlutuante mensagem={aviso} aoFechar={limpar} />
      <button
        type="button"
        disabled={processando}
        onClick={() =>
          iniciar(async () => {
            registrar(await removerPagamento(clienteId, pagamentoId));
          })
        }
        className="cursor-pointer text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline disabled:opacity-40"
      >
        Desfazer
      </button>
    </>
  );
}