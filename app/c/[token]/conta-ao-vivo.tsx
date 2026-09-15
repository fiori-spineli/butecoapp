"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { formatarMomento, formatarReais } from "@/lib/format";
import { enviarPedidoCliente } from "@/app/actions/pedidos";
import { createSupabaseAnonClient } from "@/lib/supabase/publico";
import { LoadingButeco } from "@/components/loading-buteco";
import type { ComandaPublica } from "@/lib/types";

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
  const [enviando, iniciarEnvio] = useTransition();

  const contaAberta = dados.status === "aberta";
  const cardapio = dados.cardapio ?? [];
  const pedidosPendentes = dados.pedidos_pendentes ?? [];

  // Atualização em tempo real (polling leve) para refletir quando o garçom confirmar a entrega
  useEffect(() => {
    if (!contaAberta) return;

    const supabase = createSupabaseAnonClient();
    const intervalo = setInterval(async () => {
      if (document.hidden) return;
      const { data } = await supabase.rpc("comanda_publica", { p_token: token });
      if (data) {
        setDados(data as ComandaPublica);
      }
    }, 4000);

    return () => clearInterval(intervalo);
  }, [token, contaAberta]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return cardapio;
    return cardapio.filter((p) => p.nome.toLowerCase().includes(termo));
  }, [cardapio, busca]);

  function alterarQtd(id: string, delta: number) {
    setCarrinho((prev) => {
      const atual = prev[id] ?? 0;
      const nova = Math.max(0, atual + delta);
      if (nova === 0) {
        const { [id]: _, ...resto } = prev;
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
      if (res.ok) {
        setCarrinho({});
        setAba("conta");
        setMensagemSucesso("Pedido enviado! O garçom confirmará a entrega em instantes.");

        // Atualiza a visualização com o pedido pendente
        const supabase = createSupabaseAnonClient();
        const { data } = await supabase.rpc("comanda_publica", { p_token: token });
        if (data) setDados(data as ComandaPublica);
      } else {
        setErro(res.mensagem || "Não foi possível enviar o pedido.");
      }
    });
  }

  return (
    <div className="flex flex-col text-stone-900 dark:text-stone-100">
      {/* Cabeçalho do Cartão */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
              {dados.bar_nome}
            </span>
            <h2 className="text-xl font-black tracking-tight mt-0.5">
              {dados.cliente_nome}
            </h2>
            {dados.numero_mesa && (
              <span className="mt-1.5 inline-block rounded-md bg-stone-200/70 dark:bg-stone-700 px-2.5 py-0.5 text-xs font-bold text-stone-700 dark:text-stone-200">
                Mesa {dados.numero_mesa}
              </span>
            )}
          </div>

          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider ${
              contaAberta
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
            }`}
          >
            {contaAberta ? "Aberta" : "Encerrada"}
          </span>
        </div>

        {/* Abas Alternadoras: Comanda x Cardápio */}
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
            {/* Alerta Amarelo de Pedidos Aguardando Confirmação */}
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

            {/* Quadro de Valores */}
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

            {/* Extrato de Itens Confirmados */}
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

            {/* Barra de Finalização do Carrinho */}
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