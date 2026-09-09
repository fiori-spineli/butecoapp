"use server";

import { exigirBar } from "@/lib/bar";

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
  const { supabase, bar } = await exigirBar();

  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - dias);

  const { data, error } = await supabase
    .from("relatorio_vendas_detalhado")
    .select("*")
    .eq("bar_id", bar.id)
    .gte("created_at", dataLimite.toISOString())
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as VendaDetalhada[];
}