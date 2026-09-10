import { exigirBar } from "@/lib/bar";
import { inicioDoDiaLocalISO } from "@/lib/format";

/**
 * Backup do movimento em planilha.
 *
 * O fechamento impresso é o que fica no gancho atrás do balcão; este arquivo é
 * o que sobrevive a ele. Uma linha por item lançado, com a comanda inteira em
 * volta — dá para reconstruir a noite inteira no Excel sem abrir o sistema.
 *
 * Formato pensado para o Excel em português: separador ponto e vírgula, BOM no
 * começo (sem ele o Excel abre "Cerveja" como "Cerveja" com acento quebrado) e
 * vírgula decimal nos valores.
 */

const SEPARADOR = ";";

function celula(valor: string | number | null | undefined): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  // Aspas duplas viram duas; o campo inteiro vai entre aspas. Resolve de uma
  // vez o ponto e vírgula, a quebra de linha e a aspa dentro do nome do item.
  return `"${texto.replace(/"/g, '""')}"`;
}

function dinheiro(centavos: number): string {
  return ((centavos ?? 0) / 100).toFixed(2).replace(".", ",");
}

const emSaoPaulo = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function momento(iso: string | null): string {
  return iso ? emSaoPaulo.format(new Date(iso)) : "";
}

type LinhaComanda = {
  id: string;
  nome: string;
  numero_mesa: string | null;
  status: string;
  created_at: string;
  fechada_em: string | null;
  total_centavos: number;
  pago_centavos: number;
  restante_centavos: number;
};

export async function GET() {
  const { supabase, bar } = await exigirBar();
  const inicioDoDia = inicioDoDiaLocalISO();

  // O que interessa num fechamento: o que está aberto agora (de qualquer dia,
  // inclusive a mesa esquecida de ontem) e o que foi fechado hoje.
  const { data: comandasCru } = await supabase
    .from("comandas_resumo")
    .select(
      "id, nome, numero_mesa, status, created_at, fechada_em, total_centavos, pago_centavos, restante_centavos",
    )
    .eq("bar_id", bar.id)
    .or(`status.eq.aberta,fechada_em.gte.${inicioDoDia}`)
    .order("created_at", { ascending: true });

  const comandas = (comandasCru ?? []) as LinhaComanda[];

  const { data: lancamentosCru } = comandas.length
    ? await supabase
        .from("lancamentos")
        .select("cliente_id, quantidade, valor_unitario_centavos, descricao, created_at, produtos(nome)")
        .in(
          "cliente_id",
          comandas.map((c) => c.id),
        )
        .order("created_at", { ascending: true })
    : { data: [] };

  const lancamentos = lancamentosCru ?? [];

  const cabecalho = [
    "Comanda",
    "Mesa",
    "Situacao",
    "Aberta em",
    "Fechada em",
    "Item",
    "Qtd",
    "Valor unitario",
    "Total do item",
    "Lancado em",
    "Total da comanda",
    "Pago",
    "Restante",
  ];

  const linhas: string[] = [cabecalho.map(celula).join(SEPARADOR)];

  for (const comanda of comandas) {
    const itens = lancamentos.filter(
      (l) => (l as { cliente_id: string }).cliente_id === comanda.id,
    );

    const base = [
      comanda.nome,
      comanda.numero_mesa ?? "",
      comanda.status === "aberta" ? "Aberta" : "Fechada",
      momento(comanda.created_at),
      momento(comanda.fechada_em),
    ];

    const fim = [
      dinheiro(comanda.total_centavos),
      dinheiro(comanda.pago_centavos),
      dinheiro(comanda.restante_centavos),
    ];

    // Comanda aberta sem nada lançado ainda também aparece: sumir com ela do
    // arquivo faria a conta de "quantas mesas estavam abertas" não bater.
    if (itens.length === 0) {
      linhas.push([...base, "(sem itens)", "", "", "", "", ...fim].map(celula).join(SEPARADOR));
      continue;
    }

    for (const item of itens) {
      const nome =
        (item as { produtos?: { nome?: string } | null }).produtos?.nome ??
        (item as { descricao?: string | null }).descricao ??
        "Item";
      const quantidade = (item as { quantidade: number }).quantidade;
      const unitario = (item as { valor_unitario_centavos: number }).valor_unitario_centavos;

      linhas.push(
        [
          ...base,
          nome,
          quantidade,
          dinheiro(unitario),
          dinheiro(quantidade * unitario),
          momento((item as { created_at: string }).created_at),
          ...fim,
        ]
          .map(celula)
          .join(SEPARADOR),
      );
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const corpo = `﻿${linhas.join("\r\n")}\r\n`;

  return new Response(corpo, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="fechamento-${bar.slug}-${hoje}.csv"`,
      // Conta de bar não pode vir de cache: o arquivo de agora tem de ser o
      // movimento de agora.
      "cache-control": "private, no-store",
    },
  });
}
