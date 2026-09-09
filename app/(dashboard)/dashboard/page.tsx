import Link from "next/link";
import Image from "next/image";
import { exigirBar } from "@/lib/bar";
import { formatarReais, inicioDoDiaLocalISO } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
import { TemaToggle } from "@/components/tema-toggle";
import { sair } from "@/app/actions/auth";
import type { ComandaResumo } from "@/lib/types";

export default async function DashboardPage() {
  const { supabase, bar } = await exigirBar();
  const inicioDoDia = inicioDoDiaLocalISO();

  // Executa todas as consultas financeiras e de comandas em paralelo no banco
  const [comandasResposta, consumoResposta, recebidoResposta] = await Promise.all([
    supabase
      .from("comandas_resumo")
      .select("id, nome, numero_mesa, status, total_centavos, pago_centavos, restante_centavos, itens")
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
  const abertas = comandas.filter((comanda) => comanda.status === "aberta");

  const consumoHoje = (consumoResposta.data ?? []).reduce(
    (soma, item) => soma + item.quantidade * item.valor_unitario_centavos,
    0,
  );
  const recebidoHoje = (recebidoResposta.data ?? []).reduce(
    (soma, item) => soma + item.valor_centavos,
    0,
  );

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-200">
      {/* Topo */}
      <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4">
        <div className="flex items-center gap-3.5">
          <div className="relative size-10 shrink-0">
            <Image
              src="/buteco_logo.png"
              alt="ButecoApp"
              fill
              priority
              className="object-contain"
            />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-700 dark:text-amber-500">
              ButecoApp
            </span>
            <h1 className="text-lg md:text-2xl font-black leading-tight text-stone-900 dark:text-stone-100">
              {bar.nome}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TemaToggle />
          <form action={sair}>
            <button
              type="submit"
              className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Cards de Métricas */}
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

      {/* Painel de Comandas */}
      <section className="flex-1 flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              Comandas
            </h2>
            <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400">
              {comandas.length} comanda{comandas.length === 1 ? "" : "s"} &mdash; {abertas.length} em aberto
            </p>
          </div>

          <Link
            href="/comanda/nova"
            prefetch={true}
            className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-5 py-2.5 text-xs md:text-sm font-bold text-white shadow-xs transition-transform active:scale-95 flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova comanda
          </Link>
        </div>

        {comandas.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white dark:bg-stone-900/50">
            <p className="text-base font-bold text-stone-800 dark:text-stone-200">
              Nenhuma comanda aberta
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Toque em <strong>+ Nova comanda</strong> para abrir a primeira mesa.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comandas.map((comanda) => (
              <LinhaComanda key={comanda.id} comanda={comanda} />
            ))}
          </div>
        )}
      </section>

      <TabBar ativo="comandas" />
    </div>
  );
}

function LinhaComanda({ comanda }: { comanda: ComandaResumo }) {
  const fechada = comanda.status === "fechada";

  return (
    <Link
      href={`/comanda/${comanda.id}`}
      prefetch={true}
      className={`cursor-pointer flex flex-col justify-between rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 hover:border-amber-600 dark:hover:border-amber-500 transition-all shadow-xs active:scale-[0.99] ${
        fechada ? "opacity-60 bg-stone-50 dark:bg-stone-900/60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full shrink-0 ${
                fechada ? "bg-stone-300 dark:bg-stone-700" : "bg-emerald-600 dark:bg-emerald-500"
              }`}
            />
            <h3 className="truncate font-bold text-base text-stone-900 dark:text-stone-100">
              {comanda.nome}
            </h3>
          </div>
          {comanda.numero_mesa && (
            <span className="mt-2 inline-block rounded-md bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:text-stone-300">
              Mesa {comanda.numero_mesa}
            </span>
          )}
        </div>

        <div className="text-right">
          <p className="text-lg font-black tabular-nums text-stone-900 dark:text-stone-100">
            {formatarReais(comanda.total_centavos)}
          </p>
          <span className="text-xs text-stone-400">
            {fechada ? "Encerrada" : comanda.pago_centavos > 0 ? "Parcialmente paga" : "Em aberto"}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
        <span>
          {comanda.itens} {comanda.itens === 1 ? "item" : "itens"}
        </span>
        {comanda.pago_centavos > 0 && !fechada && (
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            Restam {formatarReais(comanda.restante_centavos)}
          </span>
        )}
      </div>
    </Link>
  );
}