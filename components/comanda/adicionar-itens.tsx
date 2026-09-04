"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "./modal";
import { Miniatura } from "@/components/miniatura";
import { formatarReais, parseReaisParaCentavos } from "@/lib/format";
import { lancarItens, type ItemParaLancar } from "@/app/actions/comandas";
import type { Produto } from "@/lib/types";

export function AdicionarItens({
  clienteId,
  produtos,
  aberto,
  aoFechar,
}: {
  clienteId: string;
  produtos: Produto[];
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [modoLivre, setModoLivre] = useState(false);
  const [descricaoLivre, setDescricaoLivre] = useState("");
  const [valorLivre, setValorLivre] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return produtos;
    return produtos.filter((produto) => produto.nome.toLowerCase().includes(termo));
  }, [busca, produtos]);

  const totalSelecionado = produtos.reduce(
    (soma, produto) => soma + (quantidades[produto.id] ?? 0) * produto.preco_centavos,
    0,
  );
  const qtdSelecionada = Object.values(quantidades).reduce((soma, n) => soma + n, 0);

  function ajustar(produtoId: string, delta: number) {
    setQuantidades((atual) => {
      const novo = Math.max(0, (atual[produtoId] ?? 0) + delta);
      return { ...atual, [produtoId]: novo };
    });
  }

  function limparEFechar() {
    setQuantidades({});
    setBusca("");
    setModoLivre(false);
    setDescricaoLivre("");
    setValorLivre("");
    setErro(null);
    aoFechar();
  }

  function enviar() {
    setErro(null);

    const itens: ItemParaLancar[] = Object.entries(quantidades)
      .filter(([, quantidade]) => quantidade > 0)
      .map(([produtoId, quantidade]) => ({
        tipo: "produto" as const,
        produto_id: produtoId,
        quantidade,
      }));

    if (modoLivre) {
      const centavos = parseReaisParaCentavos(valorLivre);
      if (!descricaoLivre.trim()) {
        setErro("Descreva o que está lançando.");
        return;
      }
      if (centavos === null || centavos <= 0) {
        setErro("Digite um valor válido para o item avulso.");
        return;
      }
      itens.push({
        tipo: "livre",
        descricao: descricaoLivre,
        valor_centavos: centavos,
        quantidade: 1,
      });
    }

    if (itens.length === 0) {
      setErro("Escolha ao menos um item.");
      return;
    }

    iniciarEnvio(async () => {
      const resultado = await lancarItens(clienteId, itens);
      if (resultado.ok) limparEFechar();
      else setErro(resultado.mensagem ?? "Não consegui lançar.");
    });
  }

  return (
    <Modal titulo="Adicionar item" aberto={aberto} aoFechar={limparEFechar}>
      <label className="mb-3 flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar produto…"
          aria-label="Buscar produto"
          className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
        />
      </label>

      <div className="flex flex-col gap-2">
        {produtos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
            Nenhum produto no catálogo ainda — dá pra lançar com descrição livre aqui embaixo.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="px-1 py-4 text-center text-sm text-stone-500">
            Nada encontrado para “{busca}”.
          </p>
        ) : (
          filtrados.map((produto) => {
            const quantidade = quantidades[produto.id] ?? 0;
            return (
              <div
                key={produto.id}
                className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-2.5 ${
                  quantidade > 0 ? "border-stone-900" : "border-stone-300"
                }`}
              >
                <Miniatura url={produto.imagem_url} alt={produto.nome} tamanho={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{produto.nome}</p>
                  <p className="text-xs tabular-nums text-stone-500">
                    {formatarReais(produto.preco_centavos)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BotaoQuantidade
                    rotulo={`Tirar um ${produto.nome}`}
                    onClick={() => ajustar(produto.id, -1)}
                    desabilitado={quantidade === 0}
                  >
                    –
                  </BotaoQuantidade>
                  <span className="min-w-4 text-center text-sm font-bold tabular-nums">
                    {quantidade}
                  </span>
                  <BotaoQuantidade
                    rotulo={`Adicionar um ${produto.nome}`}
                    onClick={() => ajustar(produto.id, 1)}
                  >
                    +
                  </BotaoQuantidade>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 border-t border-stone-300 pt-4">
        {modoLivre ? (
          <div className="flex flex-col gap-2">
            <input
              value={descricaoLivre}
              onChange={(evento) => setDescricaoLivre(evento.target.value)}
              placeholder="O que foi? (ex: shot de tequila)"
              aria-label="Descrição do item avulso"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-stone-900"
            />
            <input
              value={valorLivre}
              onChange={(evento) => setValorLivre(evento.target.value)}
              inputMode="decimal"
              placeholder="Valor (ex: 12,50)"
              aria-label="Valor do item avulso"
              className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-stone-900"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setModoLivre(true)}
            className="w-full text-center text-sm text-stone-500 underline underline-offset-4 hover:text-stone-900"
          >
            ou lançar com descrição livre + valor
          </button>
        )}
      </div>

      {erro ? (
        <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {erro}
        </p>
      ) : null}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="mt-4 rounded-lg bg-stone-900 px-4 py-3.5 font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {enviando
          ? "Lançando…"
          : qtdSelecionada > 0
            ? `Adicionar ${qtdSelecionada} ${qtdSelecionada === 1 ? "item" : "itens"} · ${formatarReais(totalSelecionado)}`
            : "Adicionar à conta"}
      </button>
    </Modal>
  );
}

function BotaoQuantidade({
  children,
  onClick,
  rotulo,
  desabilitado,
}: {
  children: React.ReactNode;
  onClick: () => void;
  rotulo: string;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      aria-label={rotulo}
      className="size-11 rounded-lg border border-stone-900 text-lg font-bold leading-none text-stone-900 disabled:border-stone-300 disabled:text-stone-300"
    >
      {children}
    </button>
  );
}
