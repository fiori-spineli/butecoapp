import "server-only";

import { neonPool } from "@/lib/neon-db";
import {
  LIMITE_DE_PEDIDOS_PENDENTES as LIMITE_PENDENTES,
  QUANTIDADE_MAXIMA_POR_ITEM as QUANTIDADE_MAXIMA,
} from "@/lib/pedido-limites";

type Resultado = { ok: boolean; mensagem?: string; pedidos?: number };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function criarPedidoPublico(token: string,
  itens: { produto_id: string; quantidade: number }[]): Promise<Resultado> {
  if (!UUID.test(token) || !Array.isArray(itens) || itens.length < 1 || itens.length > 50) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const client = await neonPool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const { rows } = await client.query<{ id: string; bar_id: string; status: string }>(
      "SELECT id, bar_id, status FROM public.clientes WHERE token = $1 FOR UPDATE", [token],
    );
    const comanda = rows[0];
    if (!comanda) return { ok: false, mensagem: "Comanda não encontrada." };
    if (comanda.status !== "aberta") {
      return { ok: false, mensagem: "Esta comanda já foi fechada." };
    }
    const { rows: counts } = await client.query<{ n: string }>(
      `SELECT COUNT(*) AS n FROM public.pedidos_pendentes
       WHERE cliente_id = $1 AND status = 'pendente'`, [comanda.id],
    );
    const restantes = LIMITE_PENDENTES - Number(counts[0].n);
    if (restantes < 1) {
      return { ok: false, mensagem: "Você já tem pedidos esperando. Chame o garçom." };
    }
    // All or nothing. Skipping a bad line and answering "sent" told the customer
    // the whole cart was on its way when part of it had been silently dropped.
    if (itens.length > restantes) {
      return { ok: false, mensagem: `Dá para pedir mais ${restantes} item(ns) agora. Tire alguns do carrinho ou chame o garçom.` };
    }
    let pedidos = 0;
    for (const item of itens) {
      if (!UUID.test(item.produto_id) || !Number.isSafeInteger(item.quantidade) ||
          item.quantidade < 1 || item.quantidade > QUANTIDADE_MAXIMA) {
        return { ok: false, mensagem: `Cada item aceita de 1 a ${QUANTIDADE_MAXIMA} unidades.` };
      }
      const product = await client.query<{ preco_centavos: number }>(
        "SELECT preco_centavos FROM public.produtos WHERE id = $1 AND bar_id = $2",
        [item.produto_id, comanda.bar_id],
      );
      if (!product.rows[0]) {
        return { ok: false, mensagem: "Um item do carrinho saiu do cardápio. Atualize a página e confira." };
      }
      await client.query(
        `INSERT INTO public.pedidos_pendentes
         (bar_id, cliente_id, produto_id, quantidade, valor_unitario_centavos)
         VALUES ($1, $2, $3, $4, $5)`,
        [comanda.bar_id, comanda.id, item.produto_id,
          item.quantidade, product.rows[0].preco_centavos],
      );
      pedidos++;
    }
    await client.query("COMMIT");
    committed = true;
    return { ok: true, pedidos };
  } catch (error) {
    console.error("[pedido] falha ao criar", error);
    return { ok: false, mensagem: "Não foi possível enviar o pedido." };
  } finally {
    // A transaction left open by an early return must never reach another request.
    if (!committed) await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
}

export async function processarPedido(barId: string, pedidoId: string,
  clienteId: string, entregar: boolean): Promise<Resultado> {
  if (!UUID.test(pedidoId) || !UUID.test(clienteId)) {
    return { ok: false, mensagem: "Pedido inválido." };
  }
  const client = await neonPool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '15s'");
    const { rows } = await client.query<{
      cliente_id: string; produto_id: string; quantidade: number;
      valor_unitario_centavos: number; status: string;
    }>(
      `SELECT cliente_id, produto_id, quantidade, valor_unitario_centavos, status
         FROM public.pedidos_pendentes
        WHERE id = $1 AND bar_id = $2 AND cliente_id = $3 FOR UPDATE`,
      [pedidoId, barId, clienteId],
    );
    const pedido = rows[0];
    if (!pedido) return { ok: false, mensagem: "Pedido não encontrado." };
    if (pedido.status !== "pendente") {
      return { ok: false, mensagem: "Este pedido já foi processado." };
    }
    const comanda = await client.query<{ status: string }>(
      "SELECT status FROM public.clientes WHERE id = $1 AND bar_id = $2 FOR UPDATE",
      [clienteId, barId],
    );
    if (!comanda.rows[0]) return { ok: false, mensagem: "Comanda não encontrada." };
    if (entregar && comanda.rows[0].status !== "aberta") {
      return { ok: false, mensagem: "Reabra a comanda antes de confirmar." };
    }
    if (entregar) {
      const product = await client.query<{ nome: string }>(
        "SELECT nome FROM public.produtos WHERE id = $1 AND bar_id = $2",
        [pedido.produto_id, barId],
      );
      if (!product.rows[0]) return { ok: false, mensagem: "Produto não encontrado neste bar." };
      await client.query(
        `INSERT INTO public.lancamentos
         (cliente_id, produto_id, descricao, quantidade, valor_unitario_centavos)
         VALUES ($1, $2, $3, $4, $5)`,
        [clienteId, pedido.produto_id, product.rows[0].nome, pedido.quantidade,
          pedido.valor_unitario_centavos],
      );
    }
    await client.query(
      `UPDATE public.pedidos_pendentes SET status = $1, atendido_em = now()
        WHERE id = $2 AND bar_id = $3`,
      [entregar ? "entregue" : "cancelado", pedidoId, barId],
    );
    await client.query("COMMIT");
    committed = true;
    return { ok: true };
  } catch (error) {
    console.error("[pedido] falha ao processar", error);
    return { ok: false, mensagem: "Falha ao processar pedido." };
  } finally {
    if (!committed) await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
}
