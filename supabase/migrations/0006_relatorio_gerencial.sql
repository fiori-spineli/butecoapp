-- ButecoApp — Relatório de Vendas e Faturamento por Item para o Dono do Bar
-- Migration 0006: View gerencial segura respeitando RLS

create or replace view public.relatorio_vendas_detalhado
with (security_invoker = on) as
select
  l.id as lancamento_id,
  c.bar_id,
  c.id as comanda_id,
  c.nome as comanda_nome,
  c.numero_mesa,
  coalesce(pr.nome, l.descricao, 'Item avulso') as nome_item,
  l.quantidade,
  l.valor_unitario_centavos,
  (l.quantidade * l.valor_unitario_centavos)::bigint as total_centavos,
  l.created_at
from public.lancamentos l
join public.clientes c on c.id = l.cliente_id
left join public.produtos pr on pr.id = l.produto_id;