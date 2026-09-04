import { notFound } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { origemDoApp } from "@/lib/url";
import { formatarHora, formatarReais } from "@/lib/format";
import { Miniatura } from "@/components/miniatura";
import { VoltarPara } from "@/components/voltar";
import { AcoesComanda } from "@/components/comanda/acoes-comanda";
import {
  BotaoDesfazerPagamento,
  BotaoFecharConta,
  BotaoRemoverItem,
} from "@/components/comanda/botoes-comanda";
import type { Cliente, Lancamento, Pagamento, Produto } from "@/lib/types";

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

  const { data: clienteBruto } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const cliente = clienteBruto as Cliente | null;
  if (!cliente) notFound();

  const [lancamentosResposta, pagamentosResposta, produtosResposta] = await Promise.all([
    supabase
      .from("lancamentos")
      .select("*, produtos(nome, imagem_url)")
      .eq("cliente_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("pagamentos")
      .select("*")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("produtos").select("*").eq("bar_id", bar.id).order("nome"),
  ]);

  const lancamentos = (lancamentosResposta.data ?? []) as Lancamento[];
  const pagamentos = (pagamentosResposta.data ?? []) as Pagamento[];
  const produtos = (produtosResposta.data ?? []) as Produto[];

  const totalCentavos = lancamentos.reduce(
    (soma, item) => soma + item.quantidade * item.valor_unitario_centavos,
    0,
  );
  const pagoCentavos = pagamentos.reduce((soma, item) => soma + item.valor_centavos, 0);
  const restanteCentavos = totalCentavos - pagoCentavos;

  const pagasPorLancamento = new Map<string, number>();
  for (const pagamento of pagamentos) {
    if (!pagamento.lancamento_id || !pagamento.quantidade_paga) continue;
    pagasPorLancamento.set(
      pagamento.lancamento_id,
      (pagasPorLancamento.get(pagamento.lancamento_id) ?? 0) + pagamento.quantidade_paga,
    );
  }

  const contaAberta = cliente.status === "aberta";
  const link = `${await origemDoApp()}/c/${cliente.token}`;

  return (
    <>
      <header className="flex items-center gap-3.5 border-b border-stone-300 bg-white px-5 pt-5 pb-4">
        <VoltarPara href="/dashboard" />
        <h1 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold">
          <span className="truncate">{cliente.nome}</span>
          {cliente.numero_mesa ? (
            <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
              Mesa {cliente.numero_mesa}
            </span>
          ) : null}
        </h1>
        <BotaoFecharConta clienteId={cliente.id} contaAberta={contaAberta} />
      </header>

      <section className="flex divide-x divide-stone-300 border-b border-stone-300 bg-white">
        <div className="flex-1 px-4 py-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Total</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-stone-400">
            {formatarReais(totalCentavos)}
          </p>
        </div>
        <div className="flex-1 px-4 py-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            Restante
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums">
            {formatarReais(restanteCentavos)}
          </p>
        </div>
      </section>

      {!contaAberta ? (
        <p className="border-b border-stone-300 bg-stone-200 px-5 py-2.5 text-center text-xs font-semibold text-stone-600">
          Conta fechada — o link do cliente vale como comprovante por 24h.
        </p>
      ) : null}

      <main className="flex flex-1 flex-col gap-2 px-4 py-3.5">
        {lancamentos.length === 0 ? (
          <p className="mt-8 px-6 text-center text-sm leading-relaxed text-stone-500">
            Nada lançado ainda. Toque em <strong>Adicionar item</strong> pra começar.
          </p>
        ) : (
          lancamentos.map((lancamento) => {
            const nome = lancamento.produtos?.nome ?? lancamento.descricao ?? "Item";
            const pagas = pagasPorLancamento.get(lancamento.id) ?? 0;

            return (
              <article
                key={lancamento.id}
                className="flex items-center gap-3 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5"
              >
                <Miniatura url={lancamento.produtos?.imagem_url ?? null} alt={nome} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{nome}</p>
                  <p className="text-[11px] text-stone-400">
                    {lancamento.quantidade}x ·{" "}
                    {lancamento.produto_id ? "catálogo" : "descrição livre"}
                    {pagas > 0 ? ` · ${pagas} paga(s)` : ""} · {formatarHora(lancamento.created_at)}
                  </p>
                </div>

                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatarReais(lancamento.quantidade * lancamento.valor_unitario_centavos)}
                </span>

                {contaAberta ? (
                  <BotaoRemoverItem
                    clienteId={cliente.id}
                    lancamentoId={lancamento.id}
                    nome={nome}
                  />
                ) : null}
              </article>
            );
          })
        )}

        {pagamentos.length > 0 ? (
          <section className="mt-3">
            <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-stone-500">
              Pagamentos registrados
            </h2>
            <ul className="flex flex-col gap-1.5">
              {pagamentos.map((pagamento) => (
                <li
                  key={pagamento.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-stone-600">
                      {pagamento.descricao ?? "pagamento"}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {formatarHora(pagamento.created_at)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-stone-600">
                      − {formatarReais(pagamento.valor_centavos)}
                    </span>
                    <BotaoDesfazerPagamento clienteId={cliente.id} pagamentoId={pagamento.id} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>

      <AcoesComanda
        clienteId={cliente.id}
        nomeComanda={
          cliente.numero_mesa ? `${cliente.nome} — Mesa ${cliente.numero_mesa}` : cliente.nome
        }
        link={link}
        produtos={produtos}
        itens={lancamentos.map((lancamento) => ({
          id: lancamento.id,
          nome: lancamento.produtos?.nome ?? lancamento.descricao ?? "Item",
          quantidade: lancamento.quantidade,
          pagas: pagasPorLancamento.get(lancamento.id) ?? 0,
          valor_unitario_centavos: lancamento.valor_unitario_centavos,
        }))}
        totalCentavos={totalCentavos}
        restanteCentavos={restanteCentavos}
        contaAberta={contaAberta}
        abrirQrDeCara={nova === "1"}
      />
    </>
  );
}
