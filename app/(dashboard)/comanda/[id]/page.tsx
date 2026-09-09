import { notFound } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { formatarDataHora, formatarReais } from "@/lib/format";
import { origemDoApp } from "@/lib/url";
import { VoltarPara } from "@/components/voltar";
import { TemaToggle } from "@/components/tema-toggle";
import { Miniatura } from "@/components/miniatura";
import {
  BotaoDesfazerPagamento,
  BotaoFecharConta,
  BotaoRemoverItem,
} from "@/components/comanda/botoes-comanda";
import { AcoesComanda } from "@/components/comanda/acoes-comanda";
import type { ComandaResumo, Produto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ComandaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nova?: string }>;
}) {
  const { id } = await params;
  const { nova } = await searchParams;
  const { supabase, bar } = await exigirBar();

  const [comandaResposta, lancamentosResposta, pagamentosResposta, produtosResposta] =
    await Promise.all([
      supabase
        .from("comandas_resumo")
        .select("*")
        .eq("id", id)
        .eq("bar_id", bar.id)
        .maybeSingle(),
      supabase
        .from("lancamentos")
        .select("id, produto_id, descricao, quantidade, valor_unitario_centavos, created_at, produtos(nome, imagem_url)")
        .eq("cliente_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("pagamentos")
        .select("id, lancamento_id, quantidade_paga, valor_centavos, descricao, created_at")
        .eq("cliente_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("produtos").select("*").eq("bar_id", bar.id).order("nome"),
    ]);

  const comanda = comandaResposta.data as ComandaResumo | null;
  if (!comanda) notFound();

  const contaAberta = comanda.status === "aberta";
  const lancamentos = lancamentosResposta.data ?? [];
  const pagamentos = pagamentosResposta.data ?? [];
  const produtos = (produtosResposta.data ?? []) as Produto[];

  const pagasPorItem = pagamentos.reduce<Record<string, number>>((acc, p) => {
    if (p.lancamento_id && p.quantidade_paga) {
      acc[p.lancamento_id] = (acc[p.lancamento_id] ?? 0) + p.quantidade_paga;
    }
    return acc;
  }, {});

  const itensDivisiveis = lancamentos.map((l) => ({
    id: l.id as string,
    nome:
      ((l as { produtos?: { nome?: string } | null }).produtos?.nome ??
        (l.descricao as string | null)) ||
      "Item",
    quantidade: l.quantidade as number,
    pagas: pagasPorItem[l.id as string] ?? 0,
    valor_unitario_centavos: l.valor_unitario_centavos as number,
  }));

  const linkPublico = `${await origemDoApp()}/c/${comanda.token}`;

  return (
    <>
      {/* Cabeçalho */}
      <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <VoltarPara href="/dashboard" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black text-stone-900 dark:text-stone-100">
                {comanda.nome}
              </h1>
              {comanda.numero_mesa && (
                <span className="rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
                  Mesa {comanda.numero_mesa}
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Aberta em {formatarDataHora(comanda.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TemaToggle />
          <BotaoFecharConta
            clienteId={comanda.id}
            contaAberta={contaAberta}
            restanteCentavos={comanda.restante_centavos}
          />
        </div>
      </header>

      {/* Resumo de Totais */}
      <section className="grid grid-cols-2 divide-x divide-stone-200 dark:divide-stone-800 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60">
        <div className="p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Total consumido
          </span>
          <p className="mt-1 text-2xl font-black tabular-nums text-stone-900 dark:text-stone-100">
            {formatarReais(comanda.total_centavos)}
          </p>
        </div>
        <div className="p-4 text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Restante a pagar
          </span>
          <p
            className={`mt-1 text-2xl font-black tabular-nums ${
              comanda.restante_centavos > 0
                ? "text-amber-700 dark:text-amber-400"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            {formatarReais(comanda.restante_centavos)}
          </p>
        </div>
      </section>

      {/* Conteúdo: Itens Lançados e Pagamentos Registrados */}
      <main className="flex-1 p-6 space-y-6">
        {/* Itens */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
            Itens consumidos ({lancamentos.length})
          </h2>

          {lancamentos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 p-8 text-center bg-white dark:bg-stone-900/40">
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                Nenhum item lançado ainda
              </p>
              <p className="text-xs text-stone-400 mt-1">
                Toque em <strong>Adicionar item</strong> para anotar o primeiro pedido.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
              {lancamentos.map((item) => {
                const nomeItem =
                  (item as { produtos?: { nome?: string; imagem_url?: string | null } | null })
                    .produtos?.nome ??
                  (item.descricao as string | null) ??
                  "Item";
                const foto = (item as { produtos?: { imagem_url?: string | null } | null }).produtos?.imagem_url ?? null;
                const totalItem = (item.quantidade as number) * (item.valor_unitario_centavos as number);

                return (
                  <li key={item.id as string} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Miniatura url={foto} alt={nomeItem} tamanho={42} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-sm text-stone-900 dark:text-stone-100">
                          {nomeItem}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {item.quantidade}x {formatarReais(item.valor_unitario_centavos as number)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold tabular-nums text-sm text-stone-900 dark:text-stone-100">
                        {formatarReais(totalItem)}
                      </span>
                      {contaAberta && (
                        <BotaoRemoverItem
                          clienteId={comanda.id}
                          lancamentoId={item.id as string}
                          nome={nomeItem}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pagamentos Registrados */}
        {pagamentos.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-3">
              Pagamentos já acertados ({pagamentos.length})
            </h2>
            <ul className="divide-y divide-stone-200 dark:divide-stone-800 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
              {pagamentos.map((p) => (
                <li key={p.id as string} className="flex items-center justify-between p-4 text-xs">
                  <div>
                    <p className="font-bold text-stone-900 dark:text-stone-100">
                      {p.descricao || "Pagamento registrado"}
                    </p>
                    <p className="text-stone-400">
                      {formatarDataHora(p.created_at as string)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                      - {formatarReais(p.valor_centavos as number)}
                    </span>
                    {contaAberta && (
                      <BotaoDesfazerPagamento
                        clienteId={comanda.id}
                        pagamentoId={p.id as string}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Ações inferiores */}
      <AcoesComanda
        clienteId={comanda.id}
        nomeComanda={comanda.nome}
        link={linkPublico}
        produtos={produtos}
        itens={itensDivisiveis}
        totalCentavos={comanda.total_centavos}
        restanteCentavos={comanda.restante_centavos}
        contaAberta={contaAberta}
        abrirQrDeCara={Boolean(nova)}
      />
    </>
  );
}