import "server-only";

import { neonPool } from "@/lib/neon-db";
import type { ComandaPublica, ComandaResumo, Lancamento, Pagamento, Produto } from "@/lib/types";
import type { PedidoPendenteDono } from "@/components/comanda/pedidos-pendentes-alerta";

const resumoSelect = `id, bar_id, nome, numero_mesa, token, status, fechada_em, created_at,
  total_centavos, pago_centavos, restante_centavos, itens`;

function resumoNumerico(row: ComandaResumo): ComandaResumo {
  return {
    ...row,
    total_centavos: Number(row.total_centavos),
    pago_centavos: Number(row.pago_centavos),
    restante_centavos: Number(row.restante_centavos),
    itens: Number(row.itens),
  };
}

export async function listarComandas(barId: string): Promise<ComandaResumo[]> {
  const { rows } = await neonPool.query<ComandaResumo>(
    `SELECT ${resumoSelect} FROM public.comandas_resumo WHERE bar_id = $1
      ORDER BY status ASC, created_at DESC`, [barId],
  );
  return rows.map(resumoNumerico);
}

export async function buscarComanda(barId: string, clienteId: string): Promise<ComandaResumo | null> {
  const { rows } = await neonPool.query<ComandaResumo>(
    `SELECT ${resumoSelect} FROM public.comandas_resumo
      WHERE bar_id = $1 AND id = $2 LIMIT 1`, [barId, clienteId],
  );
  return rows[0] ? resumoNumerico(rows[0]) : null;
}

export async function listarProdutos(barId: string): Promise<Produto[]> {
  const { rows } = await neonPool.query<Produto>(
    "SELECT * FROM public.produtos WHERE bar_id = $1 ORDER BY nome", [barId],
  );
  return rows;
}

export async function buscarProduto(barId: string, produtoId: string): Promise<Produto | null> {
  const { rows } = await neonPool.query<Produto>(
    "SELECT * FROM public.produtos WHERE bar_id = $1 AND id = $2 LIMIT 1",
    [barId, produtoId],
  );
  return rows[0] ?? null;
}

export async function listarLancamentos(barId: string, clienteId: string): Promise<Lancamento[]> {
  const { rows } = await neonPool.query<Lancamento>(
    `SELECT l.*, json_build_object('nome', p.nome, 'imagem_url', p.imagem_url) AS produtos
       FROM public.lancamentos l
       JOIN public.clientes c ON c.id = l.cliente_id
       LEFT JOIN public.produtos p ON p.id = l.produto_id AND p.bar_id = c.bar_id
      WHERE c.bar_id = $1 AND c.id = $2 ORDER BY l.created_at`,
    [barId, clienteId],
  );
  return rows.map(row => ({ ...row, produtos: row.produto_id ? row.produtos : null }));
}

export async function listarPagamentos(barId: string, clienteId: string): Promise<Pagamento[]> {
  const { rows } = await neonPool.query<Pagamento>(
    `SELECT p.* FROM public.pagamentos p
       JOIN public.clientes c ON c.id = p.cliente_id
      WHERE c.bar_id = $1 AND c.id = $2 ORDER BY p.created_at`,
    [barId, clienteId],
  );
  return rows;
}

export async function listarPedidosPendentes(barId: string, clienteId: string): Promise<PedidoPendenteDono[]> {
  const { rows } = await neonPool.query<PedidoPendenteDono>(
    `SELECT pp.id, pp.cliente_id, pp.quantidade, pp.valor_unitario_centavos,
            pp.created_at, json_build_object('nome', p.nome) AS produtos
       FROM public.pedidos_pendentes pp
       JOIN public.clientes c ON c.id = pp.cliente_id AND c.bar_id = pp.bar_id
       JOIN public.produtos p ON p.id = pp.produto_id AND p.bar_id = pp.bar_id
      WHERE pp.bar_id = $1 AND pp.cliente_id = $2 AND pp.status = 'pendente'
      ORDER BY pp.created_at`,
    [barId, clienteId],
  );
  return rows;
}

export async function itensDasComandasAbertas(barId: string) {
  const { rows } = await neonPool.query<{
    cliente_id: string; quantidade: number; valor_unitario_centavos: number;
    descricao: string | null; created_at: string; produtos: { nome: string } | null;
  }>(
    `SELECT l.cliente_id, l.quantidade, l.valor_unitario_centavos,
            l.descricao, l.created_at,
            CASE WHEN p.id IS NULL THEN NULL ELSE json_build_object('nome', p.nome) END AS produtos
       FROM public.lancamentos l
       JOIN public.clientes c ON c.id = l.cliente_id
       LEFT JOIN public.produtos p ON p.id = l.produto_id AND p.bar_id = c.bar_id
      WHERE c.bar_id = $1 AND c.status = 'aberta' ORDER BY l.created_at`,
    [barId],
  );
  return rows;
}

export async function totaisDoDia(barId: string, inicioIso: string) {
  const { rows } = await neonPool.query<{
    consumo_centavos: string; recebido_centavos: string;
  }>(
    `SELECT
       (SELECT COALESCE(SUM(l.quantidade::bigint * l.valor_unitario_centavos), 0)
          FROM public.lancamentos l JOIN public.clientes c ON c.id = l.cliente_id
         WHERE c.bar_id = $1 AND l.created_at >= $2) AS consumo_centavos,
       (SELECT COALESCE(SUM(p.valor_centavos), 0)
          FROM public.pagamentos p JOIN public.clientes c ON c.id = p.cliente_id
         WHERE c.bar_id = $1 AND p.created_at >= $2) AS recebido_centavos`,
    [barId, inicioIso],
  );
  return {
    consumoHoje: Number(rows[0].consumo_centavos),
    recebidoHoje: Number(rows[0].recebido_centavos),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function buscarComandaPublica(token: string): Promise<ComandaPublica | null> {
  if (!UUID.test(token)) return null;
  const { rows } = await neonPool.query<ComandaPublica>(
    `SELECT b.nome AS bar_nome, c.nome AS cliente_nome, c.numero_mesa,
            c.status, c.created_at AS aberta_em, c.fechada_em,
            r.total_centavos, r.pago_centavos, r.restante_centavos,
            (SELECT COALESCE(json_agg(json_build_object(
                'id', l.id, 'nome', COALESCE(p.nome, l.descricao, 'Item'),
                'descricao_livre', l.produto_id IS NULL, 'imagem_url', p.imagem_url,
                'quantidade', l.quantidade, 'valor_unitario_centavos', l.valor_unitario_centavos,
                'total_centavos', l.quantidade::bigint * l.valor_unitario_centavos,
                'criado_em', l.created_at) ORDER BY l.created_at), '[]'::json)
               FROM public.lancamentos l
               LEFT JOIN public.produtos p ON p.id = l.produto_id AND p.bar_id = c.bar_id
              WHERE l.cliente_id = c.id) AS itens,
            (SELECT COALESCE(json_agg(json_build_object(
                'id', p.id, 'nome', p.nome, 'preco_centavos', p.preco_centavos,
                'imagem_url', p.imagem_url) ORDER BY p.nome), '[]'::json)
               FROM public.produtos p WHERE p.bar_id = c.bar_id) AS cardapio,
            (SELECT COALESCE(json_agg(json_build_object(
                'id', pp.id, 'nome', p.nome, 'quantidade', pp.quantidade,
                'valor_unitario_centavos', pp.valor_unitario_centavos,
                'status', pp.status, 'created_at', pp.created_at)
                ORDER BY pp.created_at DESC), '[]'::json)
               FROM public.pedidos_pendentes pp
               JOIN public.produtos p ON p.id = pp.produto_id AND p.bar_id = pp.bar_id
              WHERE pp.cliente_id = c.id AND pp.status = 'pendente') AS pedidos_pendentes
       FROM public.clientes c JOIN public.bars b ON b.id = c.bar_id
       JOIN public.comandas_resumo r ON r.id = c.id
      WHERE c.token = $1
        AND (c.status = 'aberta' OR (c.status = 'fechada'
          AND c.fechada_em > now() - interval '24 hours')) LIMIT 1`,
    [token],
  );
  const row = rows[0];
  return row ? {
    ...row,
    total_centavos: Number(row.total_centavos),
    pago_centavos: Number(row.pago_centavos),
    restante_centavos: Number(row.restante_centavos),
  } : null;
}

export async function assinaturaDoBar(barId: string): Promise<string> {
  const { rows } = await neonPool.query<{ assinatura: string }>(
    `SELECT md5(COALESCE(string_agg(linha, '|' ORDER BY linha), 'vazio')) AS assinatura
       FROM (
         SELECT 'c:' || c.id || ':' || c.status || ':' || c.nome || ':' ||
                COALESCE(c.fechada_em::text, '') AS linha
           FROM public.clientes c WHERE c.bar_id = $1 AND
                (c.status = 'aberta' OR c.created_at > now() - interval '3 days')
         UNION ALL
         SELECT 'l:' || l.id || ':' || l.quantidade || ':' || l.valor_unitario_centavos
           FROM public.lancamentos l JOIN public.clientes c ON c.id = l.cliente_id
          WHERE c.bar_id = $1 AND (c.status = 'aberta' OR c.created_at > now() - interval '3 days')
         UNION ALL
         SELECT 'p:' || p.id || ':' || p.valor_centavos
           FROM public.pagamentos p JOIN public.clientes c ON c.id = p.cliente_id
          WHERE c.bar_id = $1 AND (c.status = 'aberta' OR c.created_at > now() - interval '3 days')
         UNION ALL
         SELECT 'o:' || pp.id || ':' || pp.status
           FROM public.pedidos_pendentes pp WHERE pp.bar_id = $1
             AND pp.created_at > now() - interval '3 days'
         UNION ALL
         SELECT 'r:' || p.id || ':' || p.preco_centavos || ':' || p.estoque_atual
           FROM public.produtos p WHERE p.bar_id = $1
       ) changes`, [barId],
  );
  return rows[0].assinatura;
}
