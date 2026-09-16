-- ButecoApp — ajuste de estoque que nao perde toque. Idempotente.
--
-- Por que
--
-- O card do produto mandava o VALOR ABSOLUTO calculado no navegador
-- (`estoque_atual + 1`, lido do que o servidor tinha renderizado). Dois
-- problemas reais saem disso:
--
-- 1. Toque perdido. Enquanto a gravacao estava em curso o botao ficava
--    desabilitado e o numero na tela continuava o antigo, entao todo clique
--    dado nesse meio-tempo era descartado. Medido: 30 toques no "+" moveram o
--    estoque de 2 para 4.
-- 2. Atualizacao perdida entre aparelhos. Se o celular no salao e o
--    computador do caixa ajustam o mesmo produto quase juntos, os dois mandam
--    um absoluto calculado sobre a MESMA leitura e o ultimo a chegar apaga o
--    ajuste do outro.
--
-- A soma passa a ser feita pelo banco, sobre o valor que esta la na hora. Nao
-- existe leitura no meio para ficar velha.
--
-- `security invoker` de proposito: quem autoriza continua sendo o RLS de
-- `produtos` ("dono acessa seus produtos"). A funcao nao enxerga nada que o
-- proprio usuario ja nao enxergasse — ela so torna a operacao atomica.
-- Devolve NULL quando o RLS barra ou o produto nao existe, e quem chama trata
-- isso como recusa.

create or replace function public.ajustar_estoque(
  p_produto_id uuid,
  p_delta integer
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_novo integer;
begin
  -- Teto de sanidade: o card manda 1 por toque; um numero absurdo aqui so
  -- chegaria por chamada direta a API.
  if p_delta is null or abs(p_delta) > 1000 then
    return null;
  end if;

  update public.produtos
     set estoque_atual = greatest(0, estoque_atual + p_delta)
   where id = p_produto_id
  returning estoque_atual into v_novo;

  return v_novo;
end;
$$;

revoke all on function public.ajustar_estoque(uuid, integer) from public, anon;
grant execute on function public.ajustar_estoque(uuid, integer) to authenticated;
