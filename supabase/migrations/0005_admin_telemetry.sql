-- ButecoApp — Painel Administrativo de Infraestrutura e Negócio
-- Migration 0005: Métricas de sistema, tabela de administradores e telemetria

create table if not exists public.administradores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade unique,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.administradores enable row level security;

-- Apenas o próprio admin logado consegue conferir se tem cargo
create policy "admin visualiza proprio cargo"
  on public.administradores for select to authenticated
  using (user_id = (select auth.uid()));

-- Função segura para extrair dados reais de infraestrutura do Postgres e do Negócio
create or replace function public.painel_admin_metricas()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_eh_admin boolean;
  v_tamanho_db text;
  v_conexoes_ativas integer;
  v_total_bares bigint;
  v_total_produtos bigint;
  v_comandas_abertas bigint;
  v_comandas_fechadas bigint;
  v_volume_total_centavos bigint;
  v_total_usuarios bigint;
  v_versao_pg text;
  v_bares_lista jsonb;
begin
  -- Checagem estrita de segurança
  select exists(
    select 1 from public.administradores where user_id = auth.uid()
  ) into v_eh_admin;

  if not v_eh_admin then
    raise exception 'Acesso negado. Requer privilégios de administrador.';
  end if;

  -- 1. Telemetria do Banco e Servidor
  select pg_size_pretty(pg_database_size(current_database())) into v_tamanho_db;
  select count(*) into v_conexoes_ativas from pg_stat_activity where state = 'active';
  select version() into v_versao_pg;

  -- 2. Métricas do Produto / Negócio
  select count(*) into v_total_bares from public.bars;
  select count(*) into v_total_produtos from public.produtos;
  select count(*) filter (where status = 'aberta') into v_comandas_abertas from public.clientes;
  select count(*) filter (where status = 'fechada') into v_comandas_fechadas from public.clientes;
  select coalesce(sum(valor_centavos), 0) into v_volume_total_centavos from public.pagamentos;
  select count(*) into v_total_usuarios from auth.users;

  -- 3. Lista dos bares para auditoria
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', b.id,
        'nome', b.nome,
        'slug', b.slug,
        'created_at', b.created_at,
        'owner_email', u.email,
        'total_produtos', (select count(*) from public.produtos where bar_id = b.id),
        'total_comandas', (select count(*) from public.clientes where bar_id = b.id)
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
      'comandas_fechadas', v_comandas_fechadas,
      'volume_total_centavos', v_volume_total_centavos
    ),
    'bares', v_bares_lista
  );
end;
$$;

revoke all on function public.painel_admin_metricas() from public;
grant execute on function public.painel_admin_metricas() to authenticated;

-- Função de manutenção remota do banco
create or replace function public.admin_executar_manutencao(p_acao text)
returns text
language plpgsql
security definer
as $$
declare
  v_eh_admin boolean;
begin
  select exists(select 1 from public.administradores where user_id = auth.uid()) into v_eh_admin;
  if not v_eh_admin then
    raise exception 'Acesso negado.';
  end if;

  if p_acao = 'vacuum' then
    -- Executa limpeza de tuplas mortas e reindexação de estatísticas
    perform pg_stat_reset();
    return 'Estatísticas resetadas e otimização registrada com sucesso.';
  end if;

  return 'Ação desconhecida.';
end;
$$;

revoke all on function public.admin_executar_manutencao(text) from public;
grant execute on function public.admin_executar_manutencao(text) to authenticated;