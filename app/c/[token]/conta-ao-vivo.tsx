"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Miniatura } from "@/components/miniatura";
import {
  formatarDataHora,
  formatarMomento,
  formatarReais,
  tempoRestanteComprovante,
} from "@/lib/format";
import { TempoAberto } from "@/components/tempo-aberto";
import { BotaoImprimir } from "@/components/botao-imprimir";
import { ComprovanteComanda } from "@/components/comanda/comprovante-comanda";
import type { ComandaPublica } from "@/lib/types";

/**
 * Cadência da atualização ao vivo.
 *
 * Com a aba na frente, busca a cada 5 s — perto do "tempo real" que o cliente
 * espera quando olha a tela logo depois de pedir, e barato: uma consulta por
 * chave. Com a aba escondida (outro app, outra aba, tela apagada) não busca
 * nada; ao voltar, busca na hora. Se a rede falhar, o intervalo dobra a cada
 * erro até 1 min e a tela avisa — atualizar a página continua sendo a saída.
 */
const INTERVALO_MS = 5000;
const INTERVALO_MAXIMO_MS = 60000;

export function ContaAoVivo({
  token,
  inicial,
}: {
  token: string;
  inicial: ComandaPublica;
}) {
  const [comanda, setComanda] = useState(inicial);
  const [expirou, setExpirou] = useState(false);
  const [semConexao, setSemConexao] = useState(false);
  const falhas = useRef(0);

  const buscar = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/comanda/${token}`, { cache: "no-store" });
      if (!resposta.ok) throw new Error(String(resposta.status));
      const dados = (await resposta.json()) as ComandaPublica | null;
      falhas.current = 0;
      setSemConexao(false);
      if (!dados) {
        setExpirou(true);
        return;
      }
      setComanda(dados);
    } catch {
      falhas.current += 1;
      // Uma falha isolada é normal em rede de bar; duas seguidas é aviso.
      if (falhas.current >= 2) setSemConexao(true);
    }
  }, [token]);

  useEffect(() => {
    if (expirou) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let ativo = true;

    function agendar() {
      if (!ativo) return;
      const espera = Math.min(INTERVALO_MS * 2 ** falhas.current, INTERVALO_MAXIMO_MS);
      timer = setTimeout(async () => {
        if (!document.hidden) await buscar();
        agendar();
      }, espera);
    }

    // Voltou para a aba (ou o iOS restaurou a página do histórico): busca já,
    // sem esperar o próximo tique, e recomeça a contagem do zero.
    function aoVoltar() {
      if (document.hidden) return;
      clearTimeout(timer);
      falhas.current = 0;
      void buscar().then(agendar);
    }

    agendar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    window.addEventListener("pageshow", aoVoltar);
    window.addEventListener("online", aoVoltar);

    return () => {
      ativo = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("pageshow", aoVoltar);
      window.removeEventListener("online", aoVoltar);
    };
  }, [buscar, expirou]);

  const fechada = comanda.status === "fechada";
  const comprovanteAte = tempoRestanteComprovante(comanda.fechada_em);
  const titulo = comanda.numero_mesa ? `Mesa ${comanda.numero_mesa}` : comanda.cliente_nome;
  const subtitulo = comanda.numero_mesa ? comanda.cliente_nome : null;

  return (
    <div className="flex flex-col text-stone-900 dark:text-stone-100">
      <ComprovanteComanda
        dados={{
          barNome: comanda.bar_nome,
          clienteNome: comanda.cliente_nome,
          numeroMesa: comanda.numero_mesa,
          status: comanda.status,
          abertaEm: comanda.aberta_em,
          fechadaEm: comanda.fechada_em,
          itens: comanda.itens.map((item) => ({
            id: item.id,
            nome: item.nome,
            quantidade: item.quantidade,
            valorUnitarioCentavos: item.valor_unitario_centavos,
            criadoEm: item.criado_em,
          })),
          // A visão pública não detalha pagamentos, só o quanto já foi pago.
          pagamentos: [],
          totalCentavos: comanda.total_centavos,
          pagoCentavos: comanda.pago_centavos,
          restanteCentavos: comanda.restante_centavos,
        }}
      />

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
          ) : semConexao ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300/60 dark:border-rose-800 px-3 py-1 text-[11px] font-bold text-rose-800 dark:text-rose-300">
              <span className="size-2 rounded-full bg-rose-600 dark:bg-rose-400" aria-hidden />
              Sem conexão — atualize a página
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300/60 dark:border-emerald-800 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" aria-hidden />
              Atualizando ao vivo
            </span>
          )}
        </div>

        {/* Desde quando esta mesa está aberta. O cliente também tem direito a
            essa conta: é ela que explica por que a comanda tem tanto item. */}
        <p className="mt-3 text-[11px] text-stone-500 dark:text-stone-400">
          Aberta em {formatarDataHora(comanda.aberta_em)}
          {!fechada && (
            <>
              {" · há "}
              <TempoAberto desde={comanda.aberta_em} className="font-semibold" />
            </>
          )}
        </p>
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
                      {item.criado_em && (
                        <>
                          <span className="mx-1.5 text-stone-300 dark:text-stone-600" aria-hidden>
                            ·
                          </span>
                          {formatarMomento(item.criado_em)}
                        </>
                      )}
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
        {!expirou && (
          <div className="mb-4 flex justify-center">
            <BotaoImprimir rotulo={fechada ? "Salvar comprovante (PDF)" : "Salvar extrato (PDF)"} />
          </div>
        )}
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