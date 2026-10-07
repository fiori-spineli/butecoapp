"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, useCallback } from "react";
import { LIMITE_DE_PEDIDOS_PENDENTES, QUANTIDADE_MAXIMA_POR_ITEM } from "@/lib/pedido-limites";
import Image from "next/image";
import { formatarMomento, formatarReais } from "@/lib/format";
import { enviarPedidoCliente } from "@/app/actions/pedidos";
import { LoadingButeco } from "@/components/loading-buteco";
import { useFocoPreso } from "@/lib/use-foco-preso";
import type { ComandaPublica } from "@/lib/types";

/** localStorage não avisa a própria aba; a lista só muda quando ela mesma grava. */
const semAssinatura = () => () => {};

export function ContaAoVivo({
  token,
  inicial,
}: {
  token: string;
  inicial: ComandaPublica;
}) {
  const [dados, setDados] = useState<ComandaPublica>(inicial);
  const [aba, setAba] = useState<"conta" | "cardapio">("conta");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [dispensados, setDispensados] = useState<Set<string>>(() => new Set());
  // "OK, entendido" vale para este aparelho: sem guardar, o aviso voltava a cada
  // recarga enquanto o pedido recusado ainda aparece (2 h). Conveniência local,
  // então localStorage, com try/catch para navegação privada.
  const chaveDispensados = `buteco:recusas-vistas:${token}`;
  const vistosSalvos = useSyncExternalStore(
    semAssinatura,
    () => { try { return localStorage.getItem(chaveDispensados) ?? "[]"; } catch { return "[]"; } },
    () => "[]",
  );
  const vistosNoAparelho = useMemo(() => {
    try {
      const lista = JSON.parse(vistosSalvos);
      return new Set<string>(Array.isArray(lista) ? lista.filter((x) => typeof x === "string") : []);
    } catch { return new Set<string>(); }
  }, [vistosSalvos]);
  const [enviando, iniciarEnvio] = useTransition();

  const contaAberta = dados.status === "aberta";
  // `?? []` cria um array NOVO a cada render, e isso invalidava o useMemo
  // que depende dele mais abaixo. Memorizado, a lista so muda quando o dado muda.
  const cardapio = useMemo(() => dados.cardapio ?? [], [dados.cardapio]);
  const todosPedidos = dados.pedidos_pendentes ?? [];

  // Separa os que estão aguardando entrega dos que foram recusados pelo garçom
  const pedidosPendentes = todosPedidos.filter((p) => p.status === "pendente");
  const pedidosRecusados = todosPedidos.filter(
    (p) => p.status === "cancelado" && !dispensados.has(p.id) && !vistosNoAparelho.has(p.id)
  );
  const avisoRecusa = useRef<HTMLDivElement>(null);
  useFocoPreso(avisoRecusa, pedidosRecusados.length > 0);

  // Uma busca por vez, com prazo, e só a resposta mais recente vale.
  // Antes: sem trava, `focus` e `visibilitychange` disparavam duas buscas
  // juntas, uma requisição lenta podia chegar depois de uma nova e repor dado
  // velho, e uma pendurada não tinha prazo (GUARDRAILS §12).
  const emVoo = useRef(false);
  const geracao = useRef(0);
  const falhas = useRef(0);
  const ultimaBusca = useRef(0);

  const sincronizarConta = useCallback(async () => {
    if (emVoo.current) return;
    emVoo.current = true;
    ultimaBusca.current = Date.now();
    const minha = ++geracao.current;
    try {
      const resposta = await fetch(`/api/comanda/${token}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!resposta.ok) throw new Error(String(resposta.status));
      const atualizado = await resposta.json();
      falhas.current = 0;
      if (atualizado && minha === geracao.current) setDados(atualizado as ComandaPublica);
    } catch {
      // Rede ruim no bar é rotina: espera mais a cada falha, até 30 s.
      falhas.current = Math.min(falhas.current + 1, 4);
    } finally {
      emVoo.current = false;
    }
  }, [token]);

  // Relógio que tica a cada segundo e decide; busca a cada 2,5 s com a aba à
  // vista, recua diante de falhas e não gasta nada com a aba escondida.
  useEffect(() => {
    if (!contaAberta) return;

    const intervaloAtual = () => (falhas.current ? Math.min(2500 * 2 ** falhas.current, 30000) : 2500);
    const relogio = setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - ultimaBusca.current < intervaloAtual() - 100) return;
      void sincronizarConta();
    }, 1000);

    // Voltar à aba só antecipa a próxima volta do relógio: os eventos chegam
    // juntos e cada um disparando a própria busca criava chamadas paralelas.
    const aoVoltar = () => {
      if (document.hidden) return;
      falhas.current = 0;
      ultimaBusca.current = 0;
    };

    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);

    return () => {
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
    };
  }, [contaAberta, sincronizarConta]);

  // Ao clicar em OK no aviso de pedido recusado
  function dispensarPedidosRecusados() {
    setDispensados((prev) => {
      const proximo = new Set(prev);
      pedidosRecusados.forEach((p) => proximo.add(p.id));
      const lembrar = new Set([...vistosNoAparelho, ...proximo]);
      try { localStorage.setItem(chaveDispensados, JSON.stringify([...lembrar].slice(-100))); }
      catch { /* sem armazenamento: vale só nesta visita */ }
      return proximo;
    });
  }

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cardapio;
    return cardapio.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [cardapio, busca]);

  function alterarQtd(id: string, delta: number) {
    setCarrinho((prev) => {
      const atual = prev[id] ?? 0;
      // Mesmo teto do servidor: o carrinho não deixa montar um pedido que
      // seria recusado.
      const nova = Math.min(QUANTIDADE_MAXIMA_POR_ITEM, Math.max(0, atual + delta));
      if (delta > 0 && !prev[id] && Object.keys(prev).length >= LIMITE_DE_PEDIDOS_PENDENTES) return prev;
      if (nova === 0) {
        // Descarta a chave `id` e fica com o resto — o item saiu do carrinho.
          const resto = Object.fromEntries(Object.entries(prev).filter(([k]) => k !== id));
        return resto;
      }
      return { ...prev, [id]: nova };
    });
  }

  const totalCarrinhoCentavos = Object.entries(carrinho).reduce((acc, [id, qtd]) => {
    const prod = cardapio.find((p) => p.id === id);
    return acc + (prod ? prod.preco_centavos * qtd : 0);
  }, 0);

  const qtdTotalCarrinho = Object.values(carrinho).reduce((acc, q) => acc + q, 0);

  function submeterPedido() {
    if (qtdTotalCarrinho === 0) return;
    setErro(null);
    setMensagemSucesso(null);

    const itens = Object.entries(carrinho).map(([produto_id, quantidade]) => ({
      produto_id,
      quantidade,
    }));

    iniciarEnvio(async () => {
      const res = await enviarPedidoCliente(token, itens);
      // O servidor aceita o pedido inteiro ou nada; a mensagem só diz "enviado"
      // quando tudo foi gravado, e o carrinho só esvazia nesse caso.
      if (res.ok && res.pedidos === itens.length) {
        setCarrinho({});
        setAba("conta");
        setMensagemSucesso("Pedido enviado! O garçom confirmará a entrega em instantes.");
        await sincronizarConta();
      } else {
        setErro(res.mensagem || "Não foi possível enviar o pedido.");
      }
    });
  }

  return (
    <div className="flex flex-col text-stone-900 dark:text-stone-100">
      {/* MODAL DE PEDIDO RECUSADO PELO BAR */}
      {pedidosRecusados.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div ref={avisoRecusa} tabIndex={-1} role="alertdialog" aria-modal="true"
            aria-label="Pedido recusado pelo bar"
            className="w-full max-w-sm rounded-3xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-stone-900 p-6 shadow-2xl text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <h3 className="text-base font-black text-rose-900 dark:text-rose-200">
              Pedido recusado pelo bar
            </h3>

            <p className="mt-2 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
              O seguinte pedido não pôde ser atendido pelo balcão e <strong>não foi cobrado</strong> na sua conta:
            </p>

            <div className="my-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 p-3 text-left">
              {pedidosRecusados.map((p) => (
                <div key={p.id} className="text-xs font-bold text-rose-900 dark:text-rose-300 py-0.5">
                  • {p.quantidade}x {p.nome}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={dispensarPedidosRecusados}
              className="cursor-pointer w-full min-h-11 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              OK, Entendido
            </button>
          </div>
        </div>
      )}

      {/* Topo da Comanda Líquido e Sem Truncar */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex-1">
            <span className="block text-[clamp(0.6rem,2.5vw,0.7rem)] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1 text-balance wrap-break-word">
              {dados.bar_nome}
            </span>
            <h2 className="text-[clamp(1.25rem,5vw,1.75rem)] font-black tracking-tight leading-tight text-stone-900 dark:text-stone-100 text-balance wrap-break-word">
              {dados.cliente_nome}
            </h2>
            {dados.numero_mesa && (
              <span className="mt-2 inline-block rounded-md bg-stone-200/70 dark:bg-stone-700 px-2.5 py-1 text-xs font-bold text-stone-700 dark:text-stone-200">
                Mesa {dados.numero_mesa}
              </span>
            )}
          </div>

          <span
            className={`self-start sm:self-auto rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm ${
              contaAberta
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
            }`}
          >
            {contaAberta ? "Aberta" : "Encerrada"}
          </span>
        </div>

        {/* Abas Alternadoras: Minha Conta x Fazer Pedido */}
        {contaAberta && (
          <div className="mt-5 grid grid-cols-2 rounded-xl bg-stone-200/70 dark:bg-stone-800 p-1 border border-stone-300 dark:border-stone-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setAba("conta")}
              className={`cursor-pointer min-h-10 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                aba === "conta"
                  ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-400 shadow-xs"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              Minha Conta
            </button>
            <button
              type="button"
              onClick={() => setAba("cardapio")}
              className={`cursor-pointer min-h-10 rounded-lg transition-all text-center relative flex items-center justify-center gap-1.5 ${
                aba === "cardapio"
                  ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-400 shadow-xs"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              Fazer Pedido
              {qtdTotalCarrinho > 0 && (
                <span className="size-5 rounded-full bg-amber-700 text-white text-[10px] font-black flex items-center justify-center">
                  {qtdTotalCarrinho}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="p-5">
        {mensagemSucesso && (
          <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
            {mensagemSucesso}
          </div>
        )}

        {erro && (
          <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs font-bold text-rose-900 dark:text-rose-300">
            {erro}
          </div>
        )}

        {/* 1. ABA: MINHA CONTA */}
        {aba === "conta" && (
          <div className="space-y-5">
            {/* Alerta Amarelo de Pedidos Aguardando Confirmação do Garçom */}
            {pedidosPendentes.length > 0 && (
              <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/40 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Aguardando entrega do garçom ({pedidosPendentes.length})
                  </span>
                </div>
                <ul className="divide-y divide-amber-200 dark:divide-amber-900/60 text-xs">
                  {pedidosPendentes.map((p) => (
                    <li key={p.id} className="py-2 flex justify-between items-center">
                      <span className="font-semibold">{p.quantidade}x {p.nome}</span>
                      <span className="font-black tabular-nums text-amber-800 dark:text-amber-300">
                        {formatarReais(p.quantidade * p.valor_unitario_centavos)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Resumo Financeiro */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 p-4 grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Consumo Total
                </span>
                <p className="text-base font-black tabular-nums mt-0.5">
                  {formatarReais(dados.total_centavos)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Total Pago
                </span>
                <p className="text-base font-black tabular-nums text-emerald-600 mt-0.5">
                  {formatarReais(dados.pago_centavos)}
                </p>
              </div>
              <div className="col-span-2 pt-2 border-t border-stone-200 dark:border-stone-700 flex justify-between items-baseline">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Restante a Pagar
                </span>
                <p className="text-2xl font-black tabular-nums text-amber-800 dark:text-amber-400">
                  {formatarReais(dados.restante_centavos)}
                </p>
              </div>
            </div>

            {/* Extrato de Itens Consumidos */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-3">
                Itens Consumidos ({dados.itens?.length ?? 0})
              </h3>
              {dados.itens?.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-8 text-center text-xs text-stone-400">
                  Nenhum item consumido ainda.
                </div>
              ) : (
                <ul className="divide-y divide-stone-100 dark:divide-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                  {dados.itens.map((i) => (
                    <li key={i.id} className="flex justify-between items-center p-3.5 text-xs">
                      <div>
                        <p className="font-bold text-sm text-stone-900 dark:text-stone-100">{i.nome}</p>
                        <p className="text-stone-400 mt-0.5">
                          {i.quantidade}x {formatarReais(i.valor_unitario_centavos)} &bull; {formatarMomento(i.criado_em)}
                        </p>
                      </div>
                      <span className="font-black tabular-nums text-sm">
                        {formatarReais(i.total_centavos)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 2. ABA: CARDÁPIO (FAZER PEDIDO) */}
        {aba === "cardapio" && (
          <div>
            <div className="mb-4">
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                aria-label="Buscar no cardápio"
                placeholder="Buscar no cardápio..."
                className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 px-4 py-3 text-sm outline-none focus:border-amber-600 transition-colors"
              />
            </div>

            {produtosFiltrados.length === 0 ? (
              <p className="py-12 text-center text-xs text-stone-400">Nenhum produto disponível.</p>
            ) : (
              <ul className="space-y-3">
                {produtosFiltrados.map((prod) => {
                  const qtd = carrinho[prod.id] ?? 0;
                  return (
                    <li
                      key={prod.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative size-12 rounded-xl bg-stone-200 dark:bg-stone-800 overflow-hidden shrink-0">
                          {prod.imagem_url ? (
                            <Image
                              src={prod.imagem_url}
                              alt={prod.nome}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-lg">🍺</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm truncate">{prod.nome}</h4>
                          <p className="text-xs font-black text-amber-700 dark:text-amber-400 tabular-nums">
                            {formatarReais(prod.preco_centavos)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {qtd > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => alterarQtd(prod.id, -1)}
                              className="cursor-pointer size-8 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-black text-sm flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="min-w-5 text-center font-black text-sm">{qtd}</span>
                            <button
                              type="button"
                              onClick={() => alterarQtd(prod.id, 1)}
                              className="cursor-pointer size-8 rounded-lg bg-amber-700 text-white font-black text-sm flex items-center justify-center"
                            >
                              +
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => alterarQtd(prod.id, 1)}
                            className="cursor-pointer px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                          >
                            Pedir
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Barra Fixa de Subtotal e Envio */}
            {qtdTotalCarrinho > 0 && (
              <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Subtotal</span>
                  <p className="text-base font-black tabular-nums">
                    {qtdTotalCarrinho} item{qtdTotalCarrinho > 1 ? "s" : ""} • {formatarReais(totalCarrinhoCentavos)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={enviando}
                  onClick={submeterPedido}
                  className="cursor-pointer min-h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                >
                  {enviando ? <LoadingButeco fraseFixa="Enviando..." /> : "Enviar Pedido"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}