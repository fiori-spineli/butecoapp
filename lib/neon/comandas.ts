import "server-only";

import type { PoolClient } from "pg";
import { neonPool } from "@/lib/neon-db";
import type { ItemParaLancar } from "@/app/actions/comandas";

export class ComandaErro extends Error {}

type ClienteBloqueado = { id: string; status: "aberta" | "fechada" };

/** Every comanda mutation takes the same row lock to serialize money writes. */
async function comComanda<T>(barId: string, clienteId: string,
  fn: (client: PoolClient, cliente: ClienteBloqueado) => Promise<T>): Promise<T> {
  const client = await neonPool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<ClienteBloqueado>(
      `SELECT id, status FROM public.clientes WHERE id = $1 AND bar_id = $2 FOR UPDATE`,
      [clienteId, barId],
    );
    if (!rows[0]) throw new ComandaErro("Comanda não encontrada.");
    const value = await fn(client, rows[0]);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function aberta(cliente: ClienteBloqueado) {
  if (cliente.status !== "aberta") throw new ComandaErro("A comanda está fechada.");
}

async function saldo(client: PoolClient, clienteId: string): Promise<number> {
  const { rows } = await client.query<{ restante_centavos: string }>(
    "SELECT restante_centavos FROM public.comandas_resumo WHERE id = $1", [clienteId],
  );
  return Number(rows[0].restante_centavos);
}

export async function abrirComanda(barId: string, nome: string, numeroMesa: string | null): Promise<string> {
  const { rows } = await neonPool.query<{ id: string }>(
    `INSERT INTO public.clientes (bar_id, nome, numero_mesa)
     VALUES ($1, $2, $3) RETURNING id`, [barId, nome, numeroMesa],
  );
  return rows[0].id;
}

export async function adicionarItens(barId: string, clienteId: string, itens: ItemParaLancar[]) {
  return comComanda(barId, clienteId, async (client, cliente) => {
    aberta(cliente);
    if (!Array.isArray(itens) || itens.length < 1 || itens.length > 100) {
      throw new ComandaErro("Selecione entre 1 e 100 itens.");
    }
    for (const item of itens) {
      const quantidade = Number(item.quantidade);
      if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 999) {
        throw new ComandaErro("Quantidade inválida.");
      }
      if (item.tipo === "produto") {
        const { rows } = await client.query<{ preco_centavos: number }>(
          "SELECT preco_centavos FROM public.produtos WHERE id = $1 AND bar_id = $2",
          [item.produto_id, barId],
        );
        if (!rows[0]) throw new ComandaErro("Produto não encontrado neste bar.");
        await client.query(
          `INSERT INTO public.lancamentos
           (cliente_id, produto_id, quantidade, valor_unitario_centavos)
           VALUES ($1, $2, $3, $4)`,
          [clienteId, item.produto_id, quantidade, rows[0].preco_centavos],
        );
      } else if (item.tipo === "livre") {
        const valor = Number(item.valor_centavos);
        const descricao = String(item.descricao || "").trim();
        if (!Number.isSafeInteger(valor) || valor < 1 || valor > 10_000_000 ||
            !descricao || descricao.length > 120) {
          throw new ComandaErro("Descrição ou valor do item inválido.");
        }
        await client.query(
          `INSERT INTO public.lancamentos
           (cliente_id, descricao, quantidade, valor_unitario_centavos)
           VALUES ($1, $2, $3, $4)`,
          [clienteId, descricao, quantidade, valor],
        );
      } else {
        throw new ComandaErro("Tipo de item inválido.");
      }
    }
  });
}

export async function excluirLancamento(barId: string, clienteId: string, lancamentoId: string) {
  return comComanda(barId, clienteId, async (client, cliente) => {
    aberta(cliente);
    const result = await client.query(
      "DELETE FROM public.lancamentos WHERE id = $1 AND cliente_id = $2",
      [lancamentoId, clienteId],
    );
    if (!result.rowCount) throw new ComandaErro("Item não encontrado.");
  });
}

export async function adicionarPagamento(barId: string, clienteId: string,
  valor: number, descricao: string | null) {
  return comComanda(barId, clienteId, async (client, cliente) => {
    aberta(cliente);
    if (!Number.isSafeInteger(valor) || valor < 1 || valor > 1_000_000_000) {
      throw new ComandaErro("Valor inválido.");
    }
    const restante = await saldo(client, clienteId);
    if (valor > restante) throw new ComandaErro("Pagamento excede o saldo da comanda.");
    await client.query(
      `INSERT INTO public.pagamentos (cliente_id, valor_centavos, descricao)
       VALUES ($1, $2, $3)`, [clienteId, valor, descricao?.slice(0, 120) || null],
    );
  });
}

export async function adicionarPagamentoPorItem(barId: string, clienteId: string,
  lancamentoId: string, quantidade: number, nomePagador?: string) {
  return comComanda(barId, clienteId, async (client, cliente) => {
    aberta(cliente);
    if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
      throw new ComandaErro("Quantidade inválida.");
    }
    const { rows } = await client.query<{
      quantidade: number; valor_unitario_centavos: number; nome: string;
    }>(
      `SELECT l.quantidade, l.valor_unitario_centavos,
              COALESCE(p.nome, l.descricao, 'Item') AS nome
         FROM public.lancamentos l
         LEFT JOIN public.produtos p ON p.id = l.produto_id AND p.bar_id = $1
        WHERE l.id = $2 AND l.cliente_id = $3`, [barId, lancamentoId, clienteId],
    );
    const item = rows[0];
    if (!item) throw new ComandaErro("Item não encontrado.");
    const paid = await client.query<{ pagas: string }>(
      `SELECT COALESCE(SUM(quantidade_paga), 0) AS pagas
       FROM public.pagamentos WHERE lancamento_id = $1`, [lancamentoId],
    );
    if (quantidade > item.quantidade - Number(paid.rows[0].pagas)) {
      throw new ComandaErro("Quantidade já paga para este item.");
    }
    const valor = quantidade * item.valor_unitario_centavos;
    if (valor > await saldo(client, clienteId)) {
      throw new ComandaErro("Pagamento excede o saldo da comanda.");
    }
    const descricao = `${nomePagador?.trim() ? `${nomePagador.trim()} · ` : ""}${quantidade}x ${item.nome}`.slice(0, 120);
    await client.query(
      `INSERT INTO public.pagamentos
       (cliente_id, lancamento_id, quantidade_paga, valor_centavos, descricao)
       VALUES ($1, $2, $3, $4, $5)`,
      [clienteId, lancamentoId, quantidade, valor, descricao],
    );
  });
}

export async function repetirLancamento(barId: string, clienteId: string,
  item: { produto_id?: string | null; descricao?: string | null; valor_unitario_centavos: number }) {
  return adicionarItens(barId, clienteId, [item.produto_id
    ? { tipo: "produto", produto_id: item.produto_id, quantidade: 1 }
    : { tipo: "livre", descricao: item.descricao || "Item avulso",
        valor_centavos: item.valor_unitario_centavos, quantidade: 1 }]);
}

export async function excluirPagamento(barId: string, clienteId: string, pagamentoId: string) {
  return comComanda(barId, clienteId, async (client, cliente) => {
    aberta(cliente);
    const result = await client.query(
      "DELETE FROM public.pagamentos WHERE id = $1 AND cliente_id = $2",
      [pagamentoId, clienteId],
    );
    if (!result.rowCount) throw new ComandaErro("Pagamento não encontrado.");
  });
}

export async function encerrarComanda(barId: string, clienteId: string) {
  return comComanda(barId, clienteId, async (client, cliente) => {
    if (cliente.status === "fechada") return;
    const restante = await saldo(client, clienteId);
    if (restante > 0) {
      await client.query(
        `INSERT INTO public.pagamentos (cliente_id, valor_centavos, descricao)
         VALUES ($1, $2, 'Acerto no fechamento')`, [clienteId, restante],
      );
    }
    await client.query(
      "UPDATE public.clientes SET status = 'fechada', fechada_em = now() WHERE id = $1 AND bar_id = $2",
      [clienteId, barId],
    );
  });
}

export async function reabrirComanda(barId: string, clienteId: string) {
  return comComanda(barId, clienteId, async client => {
    await client.query(
      "UPDATE public.clientes SET status = 'aberta', fechada_em = NULL WHERE id = $1 AND bar_id = $2",
      [clienteId, barId],
    );
  });
}
