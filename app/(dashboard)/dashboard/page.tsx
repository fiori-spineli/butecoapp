import Link from "next/link";
import Image from "next/image";
import { exigirBar } from "@/lib/bar";
import { formatarReais, inicioDoDiaLocalISO } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
import { TemaToggle } from "@/components/tema-toggle";
import { sair } from "@/app/actions/auth";
import type { ComandaResumo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, bar } = await exigirBar();
  const inicioDoDia = inicioDoDiaLocalISO();

  const [comandasResposta, consumoResposta, recebidoResposta] = await Promise.all([
    supabase
      .from("comandas_resumo")
      .select("*")
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
    <>
      {/* Cabeçalho */}
      <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative size-10 shrink-0">
            <Image
              src="/buteco_logo.png"
              alt="ButecoApp"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-500">
              ButecoApp
            </p>
            <h1 className="text-lg md:text-xl font-black leading-tight text-stone-900 dark:text-stone-100">
              {bar.nome}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TemaToggle />
          <form action={sair}>
            <button
              type="submit"
              className="cursor-pointer rounded-full border border-stone-300 dark:border-stone-700 px-3.5 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Métricas do Dia */}
      <section
        aria-label="Resumo de hoje"
        className="grid grid-cols-3 divide-x divide-stone-200 dark:divide-stone-800 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
      >
        <ResumoCelula rotulo="Consumo hoje" valor={formatarReais(consumoHoje)} />
        <ResumoCelula rotulo="Recebido hoje" valor={formatarReais(recebidoHoje)} />
        <ResumoCelula rotulo="Comandas abertas" valor={String(abertas.length)} />
      </section>

      {/* Barra de Ações */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <div>
          <h2 className="text-base md:text-lg font-black tracking-tight">Comandas</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {comandas.length} registrada{comandas.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/comanda/nova"
          className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
        >
          + Nova comanda
        </Link>
      </div>

      {/* Lista de Comandas */}
      <main className="flex flex-1 flex-col gap-3 px-6 py-4">
        {comandas.length === 0 ? (
          <div className="my-auto flex flex-col items-center justify-center p-8 text-center">
            <div className="size-16 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-2xl text-stone-400 mb-3">
              📋
            </div>
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Nenhuma comanda aberta hoje
            </p>
            <p className="mt-1 max-w-[34ch] text-xs text-stone-500 dark:text-stone-400">
              Toque em <strong>+ Nova comanda</strong> assim que o primeiro cliente sentar à mesa ou no balcão.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {comandas.map((comanda) => (
              <LinhaComanda key={comanda.id} comanda={comanda} />
            ))}
          </div>
        )}
      </main>

      <TabBar ativo="comandas" />
    </>
  );
}

function ResumoCelula({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="px-3 py-4 text-center">
      <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {rotulo}
      </p>
      <p className="mt-1 text-base md:text-lg font-black tabular-nums text-stone-900 dark:text-stone-100">
        {valor}
      </p>
    </div>
  );
}

function LinhaComanda({ comanda }: { comanda: ComandaResumo }) {
  const fechada = comanda.status === "fechada";

  return (
    <Link
      href={`/comanda/${comanda.id}`}
      className={`cursor-pointer flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 py-3.5 hover:border-amber-600 dark:hover:border-amber-500 transition-colors shadow-xs ${
        fechada ? "opacity-60" : ""
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className={`size-2.5 shrink-0 rounded-full ${
            fechada ? "bg-stone-300 dark:bg-stone-700" : "bg-emerald-600 dark:bg-emerald-500"
          }`}
        />
        <span>
          <span className="flex items-center gap-2 font-bold text-stone-900 dark:text-stone-100">
            {comanda.nome}
            {comanda.numero_mesa ? (
              <span className="rounded-md bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[11px] font-semibold text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                Mesa {comanda.numero_mesa}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
            {fechada
              ? "Encerrada"
              : `${comanda.itens} ${comanda.itens === 1 ? "item" : "itens"}${
                  comanda.pago_centavos > 0
                    ? ` · restante ${formatarReais(comanda.restante_centavos)}`
                    : ""
                }`}
          </span>
        </span>
      </span>

      <span className="flex items-center gap-2">
        <span className="font-black tabular-nums text-stone-900 dark:text-stone-100">
          {formatarReais(comanda.total_centavos)}
        </span>
        <span aria-hidden className="text-stone-400">
          ›
        </span>
      </span>
    </Link>
  );
}