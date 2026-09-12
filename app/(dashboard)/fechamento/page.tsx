import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import {
  formatarDataHoraCompleta,
  formatarMomento,
  formatarReais,
  inicioDoDiaLocalISO,
} from "@/lib/format";
import { descreverDuracao } from "@/lib/tempo";
import { VoltarPara } from "@/components/voltar";
import { BotaoImprimir } from "@/components/botao-imprimir";
import type { ComandaResumo } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * O fechamento do dia — a folha que o dono confere e guarda.
 *
 * Duas coisas moram aqui e não podiam morar no dashboard: o retrato de tudo
 * que está aberto num instante determinado, e a saída em papel. O dashboard é
 * uma tela viva, boa para trabalhar; esta é uma foto, boa para conferir e
 * arquivar.
 *
 * O tempo de cada mesa é calculado no servidor, uma vez, e não fica correndo:
 * numa folha impressa "há 3h12" precisa ser a hora da geração, que está
 * carimbada no cabeçalho, e não a hora em que alguém olhou a tela.
 */
export default async function FechamentoPage() {
  const { supabase, bar } = await exigirBar();
  const geradoEm = new Date();
  const inicioDoDia = inicioDoDiaLocalISO();

  const [comandasResposta, consumoResposta, recebidoResposta] = await Promise.all([
    supabase
      .from("comandas_resumo")
      .select(
        "id, nome, numero_mesa, status, created_at, fechada_em, total_centavos, pago_centavos, restante_centavos, itens",
      )
      .eq("bar_id", bar.id)
      .eq("status", "aberta")
      .order("created_at", { ascending: true }),
    supabase
      .from("lancamentos")
      .select("quantidade, valor_unitario_centavos, clientes!inner(bar_id)")
      .eq("clientes.bar_id", bar.id)
      .gte("created_at", inicioDoDia),
    supabase
      .from("pagamentos")
      .select("valor_centavos, clientes!inner(bar_id)")
      .eq("clientes.bar_id", bar.id)
      .gte("created_at", inicioDoDia),
  ]);

  const abertas = (comandasResposta.data ?? []) as ComandaResumo[];

  const { data: itensCru } = abertas.length
    ? await supabase
        .from("lancamentos")
        .select("cliente_id, quantidade, valor_unitario_centavos, descricao, created_at, produtos(nome)")
        .in(
          "cliente_id",
          abertas.map((c) => c.id),
        )
        .order("created_at", { ascending: true })
    : { data: [] };

  const itens = (itensCru ?? []) as Array<{
    cliente_id: string;
    quantidade: number;
    valor_unitario_centavos: number;
    descricao: string | null;
    created_at: string;
    produtos?: { nome?: string } | null;
  }>;

  const consumoEmAberto = abertas.reduce((soma, c) => soma + c.total_centavos, 0);
  const pagoEmAberto = abertas.reduce((soma, c) => soma + c.pago_centavos, 0);
  const aReceber = abertas.reduce((soma, c) => soma + c.restante_centavos, 0);

  const consumoHoje = (consumoResposta.data ?? []).reduce(
    (soma, item) => soma + item.quantidade * item.valor_unitario_centavos,
    0,
  );
  const recebidoHoje = (recebidoResposta.data ?? []).reduce(
    (soma, item) => soma + item.valor_centavos,
    0,
  );

  return (
    <>
      {/* Cabeçalho da tela — não vai para o papel (ver globals.css) */}
      <header className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <VoltarPara href="/dashboard" />
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-black text-stone-900 dark:text-stone-100">
              Fechamento do dia
            </h1>
            <p className="truncate text-[11px] text-stone-400 dark:text-stone-500">
              Retrato de tudo que está aberto agora
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/api/fechamento/csv"
            prefetch={false}
            className="cursor-pointer inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 sm:px-4 py-2.5 text-xs md:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
            title="Baixar o movimento do dia em planilha"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            <span className="hidden sm:inline">Planilha</span>
          </Link>
          <BotaoImprimir />
        </div>
      </header>

      {/* ---------------- A FOLHA ---------------- */}
      <main className="folha flex-1 p-6 text-stone-900 dark:text-stone-100">
        <div className="mx-auto w-full max-w-3xl">
          <div className="borda-papel flex flex-wrap items-end justify-between gap-2 border-b-2 border-stone-800 dark:border-stone-300 pb-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight">{bar.nome}</h2>
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                Fechamento — comandas em aberto
              </p>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Gerado em {formatarDataHoraCompleta(geradoEm.toISOString())}
            </p>
          </div>

          {/* Resumo */}
          <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Comandas abertas", String(abertas.length)],
              ["Consumo em aberto", formatarReais(consumoEmAberto)],
              ["Já pago nelas", formatarReais(pagoEmAberto)],
              ["A receber", formatarReais(aReceber)],
            ].map(([rotulo, valor]) => (
              <div
                key={rotulo}
                className="borda-papel rounded-xl border border-stone-200 dark:border-stone-800 p-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  {rotulo}
                </p>
                <p className="mt-1 text-lg font-black tabular-nums">{valor}</p>
              </div>
            ))}
          </section>

          <section className="borda-papel mt-3 grid grid-cols-2 gap-3 rounded-xl border border-stone-200 dark:border-stone-800 p-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Consumo lançado hoje
              </p>
              <p className="mt-1 text-lg font-black tabular-nums">{formatarReais(consumoHoje)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Recebido hoje
              </p>
              <p className="mt-1 text-lg font-black tabular-nums">{formatarReais(recebidoHoje)}</p>
            </div>
          </section>

          {/* Quadro-resumo das mesas */}
          <h3 className="mt-8 text-sm font-black uppercase tracking-wider">
            Mesas abertas ({abertas.length})
          </h3>

          {abertas.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-700 p-6 text-center text-sm text-stone-500 dark:text-stone-400">
              Nenhuma comanda aberta neste momento. O salão está zerado.
            </p>
          ) : (
            <>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="borda-papel border-b border-stone-300 dark:border-stone-700 text-[10px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                      <th className="py-2 pr-3 font-bold">Mesa / Cliente</th>
                      <th className="py-2 pr-3 font-bold">Aberta em</th>
                      <th className="py-2 pr-3 font-bold">Tempo</th>
                      <th className="py-2 pr-3 text-right font-bold">Itens</th>
                      <th className="py-2 pr-3 text-right font-bold">Consumo</th>
                      <th className="py-2 pr-3 text-right font-bold">Pago</th>
                      <th className="py-2 text-right font-bold">A receber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abertas.map((comanda) => (
                      <tr
                        key={comanda.id}
                        className="borda-papel border-b border-stone-200 dark:border-stone-800"
                      >
                        <td className="py-2 pr-3 font-bold">
                          {comanda.numero_mesa ? `Mesa ${comanda.numero_mesa} · ` : ""}
                          {comanda.nome}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-stone-600 dark:text-stone-300">
                          {formatarMomento(comanda.created_at)}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-stone-600 dark:text-stone-300">
                          {descreverDuracao(
                            geradoEm.getTime() - Date.parse(comanda.created_at),
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{comanda.itens}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatarReais(comanda.total_centavos)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {formatarReais(comanda.pago_centavos)}
                        </td>
                        <td className="py-2 text-right font-black tabular-nums">
                          {formatarReais(comanda.restante_centavos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="borda-papel border-t-2 border-stone-800 dark:border-stone-300 text-xs font-black">
                      <td className="py-2 pr-3" colSpan={4}>
                        Total
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatarReais(consumoEmAberto)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatarReais(pagoEmAberto)}
                      </td>
                      <td className="py-2 text-right tabular-nums">{formatarReais(aReceber)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Detalhe item a item */}
              <h3 className="mt-8 text-sm font-black uppercase tracking-wider">
                Detalhe das comandas
              </h3>

              <div className="mt-3 space-y-4">
                {abertas.map((comanda) => {
                  const doCliente = itens.filter((i) => i.cliente_id === comanda.id);

                  return (
                    <div
                      key={comanda.id}
                      className="bloco-comanda borda-papel rounded-xl border border-stone-200 dark:border-stone-800 p-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-black">
                          {comanda.numero_mesa ? `Mesa ${comanda.numero_mesa} · ` : ""}
                          {comanda.nome}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400">
                          aberta em {formatarMomento(comanda.created_at)} · há{" "}
                          {descreverDuracao(geradoEm.getTime() - Date.parse(comanda.created_at))}
                        </p>
                      </div>

                      {doCliente.length === 0 ? (
                        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                          Sem itens lançados.
                        </p>
                      ) : (
                        <ul className="mt-2 divide-y divide-stone-200 dark:divide-stone-800 text-xs">
                          {doCliente.map((item, indice) => (
                            <li
                              key={`${comanda.id}-${indice}`}
                              className="flex items-center justify-between gap-3 py-1.5"
                            >
                              <span className="min-w-0 flex-1 truncate">
                                <span className="tabular-nums text-stone-500 dark:text-stone-400">
                                  {formatarMomento(item.created_at)}
                                </span>{" "}
                                {item.produtos?.nome ?? item.descricao ?? "Item"}
                              </span>
                              <span className="shrink-0 tabular-nums text-stone-600 dark:text-stone-300">
                                {item.quantidade}x {formatarReais(item.valor_unitario_centavos)}
                              </span>
                              <span className="w-20 shrink-0 text-right font-bold tabular-nums">
                                {formatarReais(item.quantidade * item.valor_unitario_centavos)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="borda-papel mt-2 flex justify-end gap-6 border-t border-stone-200 dark:border-stone-800 pt-2 text-xs">
                        <span>
                          Consumo:{" "}
                          <strong className="tabular-nums">
                            {formatarReais(comanda.total_centavos)}
                          </strong>
                        </span>
                        <span>
                          A receber:{" "}
                          <strong className="tabular-nums">
                            {formatarReais(comanda.restante_centavos)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Linha de conferência — quem fecha o caixa assina embaixo. */}
          <div className="borda-papel mt-10 flex flex-wrap gap-8 border-t border-stone-300 dark:border-stone-700 pt-6 text-[11px] text-stone-500 dark:text-stone-400">
            <div className="min-w-[200px] flex-1">
              <div className="borda-papel border-b border-stone-400 dark:border-stone-600 pb-6" />
              <p className="mt-1">Conferido por</p>
            </div>
            <div className="min-w-[140px]">
              <div className="borda-papel border-b border-stone-400 dark:border-stone-600 pb-6" />
              <p className="mt-1">Data</p>
            </div>
          </div>

          <p className="mt-6 text-center text-[10px] text-stone-400">
            ButecoApp · {bar.nome} · documento gerado pelo sistema
          </p>
        </div>
      </main>
    </>
  );
}
