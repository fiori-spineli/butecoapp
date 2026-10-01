import "server-only";

import { neonPool } from "@/lib/neon-db";

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
    let restantes = 40 - Number(counts[0].n);
    if (restantes < 1) {
      return { ok: false, mensagem: "Você já tem pedidos esperando. Chame o garçom." };
    }
    let pedidos = 0;
    for (const item of itens) {
      if (restantes < 1) break;
      if (!UUID.test(item.produto_id) || !Number.isSafeInteger(item.quantidade) ||
          item.quantidade < 1 || item.quantidade > 99) continue;
      const product = await client.query<{ preco_centavos: number }>(
        "SELECT preco_centavos FROM public.produtos WHERE id = $1 AND bar_id = $2",
        [item.produto_id, comanda.bar_id],
      );
      if (!product.rows[0]) continue;
      await client.query(
        `INSERT INTO public.pedidos_pendentes
         (bar_id, cliente_id, produto_id, quantidade, valor_unitario_centavos)
         VALUES ($1, $2, $3, $4, $5)`,
        [comanda.bar_id, comanda.id, item.produto_id,
          item.quantidade, product.rows[0].preco_centavos],
      );
      pedidos++;
      restantes--;
    }
    if (!pedidos) return { ok: false, mensagem: "Nenhum item válido para pedir." };
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
      const product = await client.query(
        "SELECT 1 FROM public.produtos WHERE id = $1 AND bar_id = $2",
        [pedido.produto_id, barId],
      );
      if (!product.rowCount) return { ok: false, mensagem: "Produto não encontrado neste bar." };
      await client.query(
        `INSERT INTO public.lancamentos
         (cliente_id, produto_id, quantidade, valor_unitario_centavos)
         VALUES ($1, $2, $3, $4)`,
        [clienteId, pedido.produto_id, pedido.quantidade, pedido.valor_unitario_centavos],
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
