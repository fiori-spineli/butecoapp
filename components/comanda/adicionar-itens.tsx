"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "./modal";
import { Miniatura } from "@/components/miniatura";
import { formatarReais, parseReaisParaCentavos } from "@/lib/format";
import { lancarItens, type ItemParaLancar } from "@/app/actions/comandas";
import { LoadingButeco } from "@/components/loading-buteco";
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
        setErro("Valor inválido. Use vírgula para os centavos, como 12,50.");
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
    <Modal titulo="Adicionar item à conta" aberto={aberto} aoFechar={limparEFechar}>
      {/* Campo de Busca */}
      <label className="mb-4 flex items-center gap-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/90 px-3.5 py-3 text-stone-900 dark:text-stone-100 shadow-xs">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-stone-400" aria-hidden>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar no catálogo..."
          aria-label="Buscar produto"
          className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500"
        />
      </label>

      {/* Lista de Produtos do Catálogo */}
      <div className="flex flex-col gap-2.5 max-h-[42vh] overflow-y-auto pr-1">
        {produtos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 p-6 text-center text-xs text-stone-500 dark:text-stone-400">
            Nenhum produto cadastrado. Você pode lançar itens com descrição livre abaixo.
          </p>
        ) : filtrados.length === 0 ? (
          <p className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
            Nenhum item encontrado para &ldquo;{busca}&rdquo;.
          </p>
        ) : (
          filtrados.map((produto) => {
            const quantidade = quantidades[produto.id] ?? 0;
            return (
              <div
                key={produto.id}
                className={`flex items-center gap-3.5 rounded-xl border p-3 transition-colors ${
                  quantidade > 0
                    ? "border-amber-700 bg-amber-50/50 dark:border-amber-500 dark:bg-amber-950/20"
                    : "border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-800/60"
                }`}
              >
                <Miniatura url={produto.imagem_url} alt={produto.nome} tamanho={42} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                    {produto.nome}
                  </p>
                  <p className="text-xs font-black tabular-nums text-amber-700 dark:text-amber-400">
                    {formatarReais(produto.preco_centavos)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => ajustar(produto.id, -1)}
                    disabled={quantidade === 0}
                    aria-label={`Remover um ${produto.nome}`}
                    className="cursor-pointer size-9 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-sm font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  >
                    -
                  </button>
                  <span className="min-w-5 text-center text-sm font-black tabular-nums text-stone-900 dark:text-stone-100">
                    {quantidade}
                  </span>
                  <button
                    type="button"
                    onClick={() => ajustar(produto.id, 1)}
                    aria-label={`Adicionar um ${produto.nome}`}
                    className="cursor-pointer size-9 rounded-lg border border-amber-700 dark:border-amber-600 bg-amber-700 dark:bg-amber-600 text-sm font-bold text-white hover:bg-amber-600 dark:hover:bg-amber-500 flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Opção de Item Avulso com Descrição Livre */}
      <div className="mt-4 border-t border-stone-200 dark:border-stone-800 pt-4">
        {modoLivre ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-800/40 p-3.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Item Avulso (Fora do catálogo)
            </span>
            <input
              value={descricaoLivre}
              onChange={(e) => setDescricaoLivre(e.target.value)}
              placeholder="O que foi? (ex: Porção especial, Shot)"
              aria-label="Descrição do item avulso"
              className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
            />
            <input
              value={valorLivre}
              onChange={(e) => setValorLivre(e.target.value)}
              inputMode="decimal"
              placeholder="Valor em R$ (ex: 15,00)"
              aria-label="Valor do item avulso"
              className="rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 font-bold"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setModoLivre(true)}
            className="cursor-pointer w-full text-center text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline"
          >
            + Lançar item com descrição livre e valor avulso
          </button>
        )}
      </div>

      {erro && (
        <p role="alert" className="mt-3 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs text-rose-900 dark:text-rose-200">
          {erro}
        </p>
      )}

      {/* Botão de Finalizar */}
      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="cursor-pointer mt-4 w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-5 py-4 font-bold text-white shadow-xs transition-colors disabled:opacity-50"
      >
        {enviando ? (
          <LoadingButeco />
        ) : qtdSelecionada > 0 ? (
          `Lançar ${qtdSelecionada} item${qtdSelecionada === 1 ? "" : "s"} (${formatarReais(totalSelecionado)})`
        ) : (
          "Lançar na comanda"
        )}
      </button>
    </Modal>
  );
}