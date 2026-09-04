"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Miniatura } from "@/components/miniatura";
import { formatarReais, tempoRestanteComprovante } from "@/lib/format";
import type { ComandaPublica } from "@/lib/types";

const INTERVALO_MS = 8000;

/**
 * A conta do cliente se atualiza sozinha: a cada poucos segundos ela relê a
 * comanda pelo token. Pausa quando a aba sai de foco.
 */
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
    const supabase = createSupabaseBrowserClient();
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-stone-100">
      <header className="border-b border-stone-300 bg-white px-6 pt-8 pb-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {comanda.bar_nome}
        </p>
        <h1 className="mt-1 text-xl font-bold">{titulo}</h1>
        {subtitulo ? <p className="text-sm text-stone-500">{subtitulo}</p> : null}

        {fechada ? (
          <p className="mt-3 inline-block rounded bg-stone-900 px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] text-white">
            PAGO
          </p>
        ) : (
          <p className="mt-3 inline-flex items-center gap-2 text-[11px] text-stone-500">
            <span className="size-1.5 animate-pulse rounded-full bg-stone-900" aria-hidden />
            atualiza sozinho
          </p>
        )}
      </header>

      <section className="px-6 pt-6 pb-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {fechada ? "Total pago" : "Saldo restante"}
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums">
          {formatarReais(fechada ? comanda.total_centavos : comanda.restante_centavos)}
        </p>

        {!fechada && comanda.pago_centavos > 0 ? (
          <p className="mt-2.5 flex justify-center gap-4 text-xs text-stone-500">
            <span>
              Total: <b className="tabular-nums text-stone-900">{formatarReais(comanda.total_centavos)}</b>
            </span>
            <span>
              Já pago: <b className="tabular-nums text-stone-900">{formatarReais(comanda.pago_centavos)}</b>
            </span>
          </p>
        ) : null}
      </section>

      <main className="flex flex-1 flex-col gap-2 px-5 py-3">
        {comanda.itens.length === 0 ? (
          <p className="mt-6 text-center text-sm text-stone-500">Nada lançado ainda.</p>
        ) : (
          comanda.itens.map((item) => (
            <article
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5"
            >
              <Miniatura url={item.imagem_url} alt={item.nome} tamanho={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.nome}</p>
                {item.quantidade > 1 ? (
                  <p className="text-[11px] text-stone-400">
                    {item.quantidade}x {formatarReais(item.valor_unitario_centavos)}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatarReais(item.total_centavos)}
              </span>
            </article>
          ))
        )}
      </main>

      <footer className="px-6 pt-4 pb-8 text-center">
        {expirou ? (
          <p className="text-xs leading-relaxed text-stone-500">
            Esta conta foi encerrada e o link não está mais disponível.
          </p>
        ) : fechada ? (
          <p className="text-xs leading-relaxed text-stone-400">
            {comprovanteAte
              ? `Comprovante disponível por mais ${comprovanteAte}.`
              : "Comprovante expirado."}
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-stone-400">
            Conta aberta — fale com o garçom para dividir ou fechar. Esta página se atualiza a
            cada novo pedido ou pagamento.
          </p>
        )}
      </footer>
    </div>
  );
}
