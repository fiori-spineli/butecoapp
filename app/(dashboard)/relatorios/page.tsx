import { exigirBar } from "@/lib/bar";
import { buscarRelatorioVendas } from "@/app/actions/relatorios";
import { formatarReais, formatarDataHora } from "@/lib/format";
import { NavPrincipal, TabBar } from "@/components/tab-bar";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
    const { bar } = await exigirBar();
    const vendas = await buscarRelatorioVendas(30); // Últimos 30 dias

    const faturamentoTotal = vendas.reduce((soma, v) => soma + v.total_centavos, 0);
    const totalItensVendidos = vendas.reduce((soma, v) => soma + v.quantidade, 0);

    // Agrupa itens mais vendidos para o ranking
    const rankingMap = new Map<string, { quantidade: number; faturamento: number }>();
    for (const v of vendas) {
        const atual = rankingMap.get(v.nome_item) ?? { quantidade: 0, faturamento: 0 };
        rankingMap.set(v.nome_item, {
            quantidade: atual.quantidade + v.quantidade,
            faturamento: atual.faturamento + v.total_centavos,
        });
    }

    const rankingItens = Array.from(rankingMap.entries())
        .map(([nome, dados]) => ({ nome, ...dados }))
        .sort((a, b) => b.faturamento - a.faturamento);

    return (
        <div className="flex flex-1 flex-col animate-in fade-in duration-150">
            {/* Cabeçalho */}
            <header className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-4">
                    <LogoButeco className="w-28 sm:w-40 md:w-52 lg:w-60 h-10 sm:h-14 md:h-18 lg:h-20" priority />
                    <div className="border-l border-stone-200 dark:border-stone-800 pl-4 hidden sm:block">
                        <h1 className="text-lg md:text-2xl font-black text-stone-900 dark:text-stone-100">
                            Relatório de Vendas
                        </h1>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                            Faturamento e histórico do bar
                        </p>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <NavPrincipal ativo="relatorios" />
                    <TemaToggle />
                </div>
            </header>

            {/* Resumo Gerencial */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 border-b border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/40">
                <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Faturamento (últimos 30 dias)
                    </span>
                    <p className="mt-2 text-3xl font-black tabular-nums text-amber-800 dark:text-amber-400">
                        {formatarReais(faturamentoTotal)}
                    </p>
                </div>

                <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                        Itens vendidos no período
                    </span>
                    <p className="mt-2 text-3xl font-black tabular-nums text-stone-900 dark:text-stone-100">
                        {totalItensVendidos} unidades
                    </p>
                </div>
            </section>

            {/* Conteúdo Principal */}
            <main className="flex-1 p-6 space-y-8">
                {/* Ranking de Mais Vendidos */}
                <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs">
                    <h2 className="text-base font-black text-stone-900 dark:text-stone-100 mb-4">
                        Itens Mais Vendidos (Ranking)
                    </h2>
                    {rankingItens.length === 0 ? (
                        <p className="text-xs text-stone-400">Nenhuma venda registrada ainda.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {rankingItens.map((item, idx) => (
                                <div key={item.nome} className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between">
                                    <div className="min-w-0 pr-2">
                                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                                            #{idx + 1} MAIS VENDIDO
                                        </span>
                                        <p className="text-sm font-bold truncate text-stone-900 dark:text-stone-100">
                                            {item.nome}
                                        </p>
                                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                            {item.quantidade} unidades vendidas
                                        </p>
                                    </div>
                                    <span className="text-sm font-black tabular-nums text-stone-900 dark:text-stone-100 shrink-0">
                                        {formatarReais(item.faturamento)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Extrato Detalhado de Vendas */}
                <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
                    <div className="p-6 border-b border-stone-200 dark:border-stone-800">
                        <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
                            Extrato Detalhado de Lançamentos
                        </h2>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            Histórico de cada produto adicionado às comandas
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Data e Hora</th>
                                    <th className="px-6 py-3">Comanda / Mesa</th>
                                    <th className="px-6 py-3">Produto / Item</th>
                                    <th className="px-6 py-3">Qtd</th>
                                    <th className="px-6 py-3">Valor Unit.</th>
                                    <th className="px-6 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80 text-stone-800 dark:text-stone-200">
                                {vendas.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-stone-400">
                                            Nenhum lançamento registrado nos últimos 30 dias.
                                        </td>
                                    </tr>
                                ) : (
                                    vendas.map((v) => (
                                        <tr key={v.lancamento_id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                                            <td className="px-6 py-4 text-stone-500 whitespace-nowrap">
                                                {formatarDataHora(v.created_at)}
                                            </td>
                                            <td className="px-6 py-4 font-bold">
                                                {v.comanda_nome}
                                                {v.numero_mesa && (
                                                    <span className="ml-1.5 text-[10px] bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-500">
                                                        Mesa {v.numero_mesa}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-100">
                                                {v.nome_item}
                                            </td>
                                            <td className="px-6 py-4 tabular-nums font-bold">
                                                {v.quantidade}x
                                            </td>
                                            <td className="px-6 py-4 tabular-nums text-stone-600 dark:text-stone-400">
                                                {formatarReais(v.valor_unitario_centavos)}
                                            </td>
                                            <td className="px-6 py-4 text-right tabular-nums font-black text-amber-800 dark:text-amber-400">
                                                {formatarReais(v.total_centavos)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            <TabBar ativo="relatorios" />
        </div>
    );
}