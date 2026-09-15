import { exigirBar } from "@/lib/bar";
import { buscarRelatorioVendas } from "@/app/actions/relatorios";
import { formatarReais, formatarDataHora } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
import { CabecalhoDono } from "@/components/cabecalho-dono";
import { AtualizacaoAoVivo } from "@/components/atualizacao-ao-vivo";
import { EstatisticasDashboard } from "@/components/estatisticas-dashboard";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
    const { bar } = await exigirBar();
    const vendas = await buscarRelatorioVendas(30);

    const faturamentoTotal = vendas.reduce((soma, v) => soma + v.total_centavos, 0);
    const totalItensVendidos = vendas.reduce((soma, v) => soma + v.quantidade, 0);

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
            <AtualizacaoAoVivo />
            <CabecalhoDono
                ativo="relatorios"
                titulo="Relatório de Vendas"
                subtitulo="Faturamento e histórico do bar"
            />

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

            {/* Passa o horário de abertura e fechamento configurado pelo dono nas configurações */}
            <EstatisticasDashboard 
                vendas={vendas} 
                horarioAbertura={bar.horario_abertura} 
                horarioFechamento={bar.horario_fechamento} 
            />

            <main className="flex-1 p-6 space-y-8">
                {/* O restante do seu código de ranking e extrato... */}
            </main>

            <TabBar ativo="relatorios" />
        </div>
    );
}