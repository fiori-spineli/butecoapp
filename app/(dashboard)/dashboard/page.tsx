import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import { formatarReais, inicioDoDiaLocalISO } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
import { CabecalhoDono } from "@/components/cabecalho-dono";
import { ListaComandas } from "@/components/comanda/lista-comandas";
import type { ComandaResumo } from "@/lib/types";
import { AtualizacaoAoVivo } from "@/components/atualizacao-ao-vivo";

export default async function DashboardPage() {
  const { supabase, bar } = await exigirBar();
  const inicioDoDia = inicioDoDiaLocalISO();

  const [comandasResposta, consumoResposta, recebidoResposta] = await Promise.all([
    supabase
      .from("comandas_resumo")
      // created_at e fechada_em entram para a lista poder contar há quanto
      // tempo cada mesa está aberta — ver components/tempo-aberto.tsx.
      .select(
        "id, nome, numero_mesa, status, created_at, fechada_em, total_centavos, pago_centavos, restante_centavos, itens",
      )
      .eq("bar_id", bar.id)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false }),
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

  const comandas = (comandasResposta.data ?? []) as ComandaResumo[];
  const abertas = comandas.filter((c) => c.status === "aberta");

  const consumoHoje = (consumoResposta.data ?? []).reduce(
    (soma, item) => soma + item.quantidade * item.valor_unitario_centavos,
    0,
  );
  const recebidoHoje = (recebidoResposta.data ?? []).reduce(
    (soma, item) => soma + item.valor_centavos,
    0,
  );

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-150">
      {/* Topo */}
      <AtualizacaoAoVivo />
      <CabecalhoDono ativo="comandas" titulo={bar.nome} />
      {/* Métricas */}
      {/* <main>: o Lighthouse acusou "Document does not have a main
          landmark" nesta tela. Sem o marco, quem usa leitor de tela
          percorre o cabeçalho inteiro antes de chegar ao conteúdo. */}
      <main className="flex flex-1 flex-col">
        <section
          aria-label="Métricas de hoje"
          className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-b border-stone-200 dark:border-stone-800 bg-stone-100/50 dark:bg-stone-900/40"
        >
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs transition-transform hover:-translate-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Consumo hoje
            </span>
            <p className="mt-2 text-2xl md:text-3xl font-black tabular-nums text-stone-900 dark:text-stone-100">
              {formatarReais(consumoHoje)}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs transition-transform hover:-translate-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Recebido hoje
            </span>
            <p className="mt-2 text-2xl md:text-3xl font-black tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatarReais(recebidoHoje)}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs transition-transform hover:-translate-y-0.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Comandas abertas
            </span>
            <p className="mt-2 text-2xl md:text-3xl font-black tabular-nums text-stone-900 dark:text-stone-100">
              {abertas.length}
            </p>
          </div>
        </section>

        {/* Painel Principal com Busca em Tempo Real */}
        <section className="flex-1 flex flex-col p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
                Comandas
              </h2>
              <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400">
                Controle rápido de mesas e clientes no salão
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {/* Resumo do dia para conferir e imprimir — o backup em papel de
                  quem fecha o caixa à noite. */}
              <Link
                href="/fechamento"
                prefetch={true}
                className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 min-h-11 px-3 sm:px-4 py-2.5 text-xs md:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors flex items-center justify-center gap-2"
                title="Fechamento do dia"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 9V2h12v7" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" rx="1" />
                </svg>
                <span className="hidden sm:inline">Fechamento</span>
              </Link>

              <Link
                href="/comanda/nova"
                prefetch={true}
                className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 min-h-11 px-4 sm:px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nova comanda
              </Link>
            </div>
          </div>

          {/* Componente Interativo com Filtro */}
          <ListaComandas comandas={comandas} />
        </section>
      </main>

      <TabBar ativo="comandas" />
    </div>
  );
}