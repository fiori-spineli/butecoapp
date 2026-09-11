-- ButecoApp — o painel de admin vira gestão de clientes, e para de olhar
-- dinheiro que não é nosso.
-- Idempotente.

-- ============================================================
-- Por que mexer nas métricas
--
-- `painel_admin_metricas` devolvia `volume_total_centavos`: a soma de TODOS os
-- pagamentos de TODOS os bares. Isso é o faturamento dos nossos clientes, e nós
-- não temos nada que ver com ele. O painel existe para responder "esse bar está
-- usando o sistema?", não "esse bar está ganhando quanto?".
--
-- O que entra no lugar é sinal de uso, não de caixa:
--   - ultima_atividade: quando a última comanda foi aberta naquele bar. É o
--     número que diz se o cliente sumiu.
--   - suspenso: se o acesso está bloqueado.
--   - owner_id: sem ele o painel não consegue suspender nem excluir ninguém.
-- ============================================================

create or replace function public.painel_admin_metricas()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_tamanho_db text;
  v_conexoes_ativas integer;
  v_total_bares bigint;
  v_total_produtos bigint;
  v_comandas_abertas bigint;
  v_comandas_fechadas bigint;
  v_total_usuarios bigint;
  v_versao_pg text;
  v_bares_lista jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Acesso negado. Requer administrador com segundo fator verificado.';
  end if;

  select pg_size_pretty(pg_database_size(current_database())) into v_tamanho_db;
  select count(*) into v_conexoes_ativas from pg_stat_activity where state = 'active';
  select version() into v_versao_pg;

  select count(*) into v_total_bares from public.bars;
  select count(*) into v_total_produtos from public.produtos;
  select count(*) filter (where status = 'aberta') into v_comandas_abertas from public.clientes;
  select count(*) filter (where status = 'fechada') into v_comandas_fechadas from public.clientes;
  select count(*) into v_total_usuarios from auth.users;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'nome', b.nome,
        'slug', b.slug,
        'created_at', b.created_at,
        'owner_id', b.owner_id,
        'owner_email', u.email,
        'email_confirmado', (u.email_confirmed_at is not null),
        'ultimo_login', u.last_sign_in_at,
        'suspenso', (u.banned_until is not null and u.banned_until > now()),
        'total_produtos', (select count(*) from public.produtos where bar_id = b.id),
        'total_comandas', (select count(*) from public.clientes where bar_id = b.id),
        'comandas_abertas', (select count(*) from public.clientes where bar_id = b.id and status = 'aberta'),
        'ultima_atividade', (select max(created_at) from public.clientes where bar_id = b.id)
      )
      order by b.created_at desc
    ),
    '[]'::jsonb
  )
  into v_bares_lista
  from public.bars b
  left join auth.users u on u.id = b.owner_id;

  return jsonb_build_object(
    'infra', jsonb_build_object(
      'tamanho_banco', v_tamanho_db,
      'conexoes_ativas', v_conexoes_ativas,
      'versao_postgres', v_versao_pg,
      'total_usuarios', v_total_usuarios
    ),
    'negocio', jsonb_build_object(
      'total_bares', v_total_bares,
      'total_produtos', v_total_produtos,
      'comandas_abertas', v_comandas_abertas,
      'comandas_fechadas', v_comandas_fechadas
    ),
    'bares', v_bares_lista
  );
end;
$$;

revoke all on function public.painel_admin_metricas() from public, anon;
grant execute on function public.painel_admin_metricas() to authenticated;

comment on function public.painel_admin_metricas() is
  'Painel de gestão de clientes. De propósito NÃO devolve faturamento: o dinheiro do bar é do bar.';
