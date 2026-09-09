"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseAnonClient } from "@/lib/supabase/publico";
import { Miniatura } from "@/components/miniatura";
import { formatarReais, tempoRestanteComprovante } from "@/lib/format";
import type { ComandaPublica } from "@/lib/types";

const INTERVALO_MS = 8000;

export function ContaAoVivo({
  token,
  inicial,
}: {
  token: string;
  inicial: ComandaPublica;
}) {
  const [comanda, setComanda] = useState(inicial);
  const [expirou, setExpirou] = useState(false);

  const buscar = useCallback(async () => {
    const supabase = createSupabaseAnonClient();
    const { data, error } = await supabase.rpc("comanda_publica", { p_token: token });
    if (error) return;
    if (!data) {
      setExpirou(true);
      return;
    }
    setComanda(data as ComandaPublica);
  }, [token]);

  useEffect(() => {
    if (expirou) return;

    const intervalo = setInterval(() => {
      if (!document.hidden) void buscar();
    }, INTERVALO_MS);

    function aoVoltarPraAba() {
      if (!document.hidden) void buscar();
    }

    document.addEventListener("visibilitychange", aoVoltarPraAba);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltarPraAba);
    };
  }, [buscar, expirou]);

  const fechada = comanda.status === "fechada";
  const comprovanteAte = tempoRestanteComprovante(comanda.fechada_em);
  const titulo = comanda.numero_mesa ? `Mesa ${comanda.numero_mesa}` : comanda.cliente_nome;
  const subtitulo = comanda.numero_mesa ? comanda.cliente_nome : null;

  return (
    <div className="flex flex-col text-stone-900 dark:text-stone-100">
      {/* Cabeçalho do Cartão com Status */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/50 p-6 text-center">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-700 dark:text-amber-500">
          {comanda.bar_nome}
        </span>
        <h1 className="mt-1 text-2xl font-black tracking-tight">{titulo}</h1>
        {subtitulo && (
          <p className="mt-0.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
            {subtitulo}
          </p>
        )}

        <div className="mt-3 flex justify-center">
          {fechada ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 dark:bg-stone-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white dark:text-stone-900">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Conta Paga
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300/60 dark:border-emerald-800 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" aria-hidden />
              Atualizando ao vivo
            </span>
          )}
        </div>
      </header>

      {/* Seção de Destaque do Saldo */}
      <section className="p-6 text-center border-b border-stone-200 dark:border-stone-800 bg-amber-50/40 dark:bg-amber-950/20">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {fechada ? "Total pago" : "Saldo restante a pagar"}
        </span>
        <p className="mt-1 text-4xl md:text-5xl font-black tabular-nums text-amber-800 dark:text-amber-400 tracking-tight">
          {formatarReais(fechada ? comanda.total_centavos : comanda.restante_centavos)}
        </p>

        {!fechada && comanda.pago_centavos > 0 && (
          <div className="mt-3 flex justify-center gap-6 text-xs text-stone-600 dark:text-stone-400 border-t border-amber-200/50 dark:border-amber-900/30 pt-3 max-w-xs mx-auto">
            <span>
              Total: <strong className="tabular-nums text-stone-900 dark:text-stone-100">{formatarReais(comanda.total_centavos)}</strong>
            </span>
            <span>
              Já pago: <strong className="tabular-nums text-emerald-700 dark:text-emerald-400">{formatarReais(comanda.pago_centavos)}</strong>
            </span>
          </div>
        )}
      </section>

      {/* Lista de Itens Consumidos */}
      <section className="p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-4">
          Itens pedidos ({comanda.itens.length})
        </h2>

        {comanda.itens.length === 0 ? (
          <p className="my-6 text-center text-xs text-stone-400 dark:text-stone-500">
            Nenhum item lançado nessa mesa até o momento.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800/80">
            {comanda.itens.map((item) => (
              <li key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Miniatura url={item.imagem_url} alt={item.nome} tamanho={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                      {item.nome}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {item.quantidade}x {formatarReais(item.valor_unitario_centavos)}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-sm font-black tabular-nums text-stone-900 dark:text-stone-100">
                  {formatarReais(item.total_centavos)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rodapé Informativo */}
      <footer className="p-6 pt-2 pb-6 text-center border-t border-stone-100 dark:border-stone-800/60">
        {expirou ? (
          <p className="text-xs leading-relaxed text-stone-500">
            Esta conta foi encerrada e o comprovante não está mais disponível.
          </p>
        ) : fechada ? (
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            {comprovanteAte
              ? `Comprovante disponível por mais ${comprovanteAte}.`
              : "Comprovante expirado."}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Conta aberta. Chame o garçom para dividir ou fechar a conta. Esta tela atualiza automaticamente a cada novo pedido.
          </p>
        )}
      </footer>
    </div>
  );
}