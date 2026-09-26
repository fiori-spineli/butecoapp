import { exigirBar } from "@/lib/bar";
import { inicioDoDiaLocalISO } from "@/lib/format";
import { neonPool } from "@/lib/neon-db";

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

/** Valor em reais já formatado ("14,00", "-4,75") — número, não fórmula. */
const NUMERO = /^-?\d+(,\d+)?$/;

function celula(valor: string | number | null | undefined): string {
  let texto = valor === null || valor === undefined ? "" : String(valor);
  // Nome de comanda e de item é texto que veio de fora (o dono digita, e o
  // cliente pode ditar "=HYPERLINK(...)" como nome da mesa). O Excel executa
  // fórmula mesmo dentro de aspas quando a célula começa com = + - @, TAB ou
  // CR. O apóstrofo na frente faz ele mostrar o texto como texto.
  if (/^[=+\-@\t\r]/.test(texto) && !NUMERO.test(texto)) texto = `'${texto}`;
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
  const { bar } = await exigirBar();
  const inicioDoDia = inicioDoDiaLocalISO();

  // O que interessa num fechamento: o que está aberto agora (de qualquer dia,
  // inclusive a mesa esquecida de ontem) e o que foi fechado hoje.
  const { rows: comandasCru } = await neonPool.query<LinhaComanda>(
    `SELECT id, nome, numero_mesa, status, created_at, fechada_em,
            total_centavos, pago_centavos, restante_centavos
       FROM public.comandas_resumo
      WHERE bar_id = $1 AND (status = 'aberta' OR fechada_em >= $2)
      ORDER BY created_at`, [bar.id, inicioDoDia],
  );
  const comandas = comandasCru.map(c => ({
    ...c, total_centavos: Number(c.total_centavos), pago_centavos: Number(c.pago_centavos),
    restante_centavos: Number(c.restante_centavos),
  }));
  const { rows: lancamentos } = await neonPool.query<{
    cliente_id: string; quantidade: number; valor_unitario_centavos: number;
    descricao: string | null; created_at: string; produtos: { nome: string } | null;
  }>(
    `SELECT l.cliente_id, l.quantidade, l.valor_unitario_centavos,
            l.descricao, l.created_at,
            CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('nome', p.nome) END AS produtos
       FROM public.lancamentos l JOIN public.clientes c ON c.id = l.cliente_id
       LEFT JOIN public.produtos p ON p.id = l.produto_id AND p.bar_id = c.bar_id
      WHERE c.bar_id = $1 AND (c.status = 'aberta' OR c.fechada_em >= $2)
      ORDER BY l.created_at`, [bar.id, inicioDoDia],
  );

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
