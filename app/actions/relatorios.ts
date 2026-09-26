"use server";

import { exigirBar } from "@/lib/bar";
import { neonPool } from "@/lib/neon-db";

export interface VendaDetalhada {
  lancamento_id: string;
  comanda_nome: string;
  numero_mesa: string | null;
  nome_item: string;
  quantidade: number;
  valor_unitario_centavos: number;
  total_centavos: number;
  created_at: string;
}

export async function buscarRelatorioVendas(dias: number = 7) {
  const { bar } = await exigirBar();

  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);

  const { rows } = await neonPool.query<VendaDetalhada>(
    `SELECT lancamento_id, comanda_nome, numero_mesa, nome_item, quantidade,
            valor_unitario_centavos, total_centavos, created_at
       FROM public.relatorio_vendas_detalhado
      WHERE bar_id = $1 AND created_at >= $2 ORDER BY created_at DESC`,
    [bar.id, dataLimite.toISOString()],
  );
  return rows.map(row => ({ ...row, total_centavos: Number(row.total_centavos) }));
}
