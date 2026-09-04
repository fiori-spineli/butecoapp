import Link from "next/link";
import { exigirBar } from "@/lib/bar";
import { formatarReais, inicioDoDiaLocalISO } from "@/lib/format";
import { TabBar } from "@/components/tab-bar";
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
      <header className="flex items-center justify-between border-b border-stone-300 bg-white px-5 pt-5 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
            BotecoApp
          </p>
          <h1 className="mt-0.5 text-lg font-bold leading-tight">{bar.nome}</h1>
        </div>
        <form action={sair}>
          <button
            type="submit"
            className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900"
          >
            Sair
          </button>
        </form>
      </header>

      <section
        aria-label="Resumo de hoje"
        className="grid grid-cols-3 divide-x divide-stone-300 border-b border-stone-300 bg-white"
      >
        <ResumoCelula rotulo="Consumo hoje" valor={formatarReais(consumoHoje)} />
        <ResumoCelula rotulo="Recebido hoje" valor={formatarReais(recebidoHoje)} />
        <ResumoCelula rotulo="Comandas abertas" valor={String(abertas.length)} />
      </section>

      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <h2 className="text-base font-bold">Comandas</h2>
        <Link
          href="/comanda/nova"
          className="rounded-full bg-stone-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800"
        >
          + Nova comanda
        </Link>
      </div>

      <main className="flex flex-1 flex-col gap-2.5 px-4 py-3">
        {comandas.length === 0 ? (
          <p className="mt-10 px-6 text-center text-sm leading-relaxed text-stone-500">
            Nenhuma comanda ainda. Toque em <strong>+ Nova comanda</strong> quando o
            primeiro cliente sentar.
          </p>
        ) : (
          comandas.map((comanda) => <LinhaComanda key={comanda.id} comanda={comanda} />)
        )}
      </main>

      <TabBar ativo="comandas" />
    </>
  );
}

function ResumoCelula({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="px-2 py-3.5 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
        {rotulo}
      </p>
      <p className="mt-0.5 text-base font-bold tabular-nums">{valor}</p>
    </div>
  );
}

function LinhaComanda({ comanda }: { comanda: ComandaResumo }) {
  const fechada = comanda.status === "fechada";

  return (
    <Link
      href={`/comanda/${comanda.id}`}
      className={`flex items-center justify-between rounded-xl border border-stone-300 bg-white px-4 py-3.5 ${
        fechada ? "opacity-60" : ""
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className={`size-2.5 shrink-0 rounded-full ${fechada ? "bg-stone-300" : "bg-stone-900"}`}
        />
        <span>
          <span className="flex items-center gap-1.5 font-semibold">
            {comanda.nome}
            {comanda.numero_mesa ? (
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
                Mesa {comanda.numero_mesa}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-xs text-stone-400">
            {fechada
              ? "fechada"
              : `${comanda.itens} ${comanda.itens === 1 ? "item" : "itens"}${
                  comanda.pago_centavos > 0
                    ? ` · restante ${formatarReais(comanda.restante_centavos)}`
                    : ""
                }`}
          </span>
        </span>
      </span>

      <span className="flex items-center gap-2">
        <span className="font-bold tabular-nums">
          {formatarReais(comanda.total_centavos)}
        </span>
        <span aria-hidden className="text-stone-300">
          ›
        </span>
      </span>
    </Link>
  );
}
