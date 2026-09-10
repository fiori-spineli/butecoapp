-- ButecoApp — o 2FA do painel passa a valer de verdade, e o resto do
-- auto-cadastro sai do caminho.
-- Idempotente.

-- ============================================================
-- 1. O segundo fator era decoração
--
-- Achado exercitando o banco com a sessão de um admin em `aal1` (entrou só com
-- a senha, sem digitar o código do app autenticador):
--
--   eh_admin()                -> true
--   painel_admin_metricas()   -> devolveu tudo, incluindo o e-mail do dono de
--                                cada bar
--   select em interessados    -> permitido
--
-- Ou seja: a tela pedia o código, mas o banco entregava os dados a quem
-- tivesse apenas a senha. E como o painel é renderizado no servidor, os dados
-- já viajavam dentro do HTML antes da tela do 2FA aparecer — bastava abrir o
-- código-fonte da página.
--
-- `aal2` significa "essa sessão passou por um segundo fator". JWT sem o claim
-- `aal` conta como `aal1`, então o coalesce fecha o caso do token antigo.
-- ============================================================

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (select 1 from public.administradores where user_id = auth.uid())
     and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

comment on function public.eh_admin() is
  'Admin COM segundo fator verificado nesta sessão. Só entrega true em aal2.';

revoke all on function public.eh_admin() from public;
-- `authenticated` precisa do EXECUTE: as policies da tabela `interessados`
-- chamam esta função, e expressão de policy roda com o papel de quem consulta.
-- A função não vaza nada — responde sobre quem pergunta.
grant execute on function public.eh_admin() to authenticated;

-- ============================================================
-- 2. As duas funções do painel passam a usar a mesma porta
-- ============================================================

create or replace function public.admin_executar_manutencao(p_acao text)
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_tabela text;
  v_total  integer := 0;
begin
  if not public.eh_admin() then
    raise exception 'Acesso negado. Requer administrador com segundo fator verificado.';
  end if;

  if p_acao = 'analisar' then
    foreach v_tabela in array array[
      'bars', 'clientes', 'produtos', 'lancamentos', 'pagamentos', 'interessados'
    ] loop
      execute format('analyze public.%I', v_tabela);
      v_total := v_total + 1;
    end loop;

    return format(
      'Estatísticas do planejador recalculadas em %s tabelas. O Postgres volta a escolher os planos de consulta com dados atuais.',
      v_total
    );
  end if;

  return 'Ação desconhecida.';
end;
$$;

revoke all on function public.admin_executar_manutencao(text) from public, anon;
grant execute on function public.admin_executar_manutencao(text) to authenticated;

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
  v_volume_total_centavos bigint;
  v_total_usuarios bigint;
  v_versao_pg text;
  v_bares_lista jsonb;
begin
  -- Antes: só conferia se o user_id estava em `administradores`. Agora exige
  -- o segundo fator — esta função devolve o e-mail do dono de cada bar.
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
  select coalesce(sum(valor_centavos), 0) into v_volume_total_centavos from public.pagamentos;
  select count(*) into v_total_usuarios from auth.users;

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

revoke all on function public.painel_admin_metricas() from public, anon;
grant execute on function public.painel_admin_metricas() to authenticated;

-- ============================================================
-- 3. Sobra do auto-cadastro: uma porta de escrita aberta para anônimo
--
-- As duas funções de limite por IP nasceram na 0007 para o cadastro público.
-- Com o cadastro público removido (0010), viraram código morto — mas
-- continuavam executáveis por `anon`. Testado contra a produção com a chave
-- anônima: `POST /rest/v1/rpc/registrar_cadastro_do_ip` respondeu **204**.
--
-- Isso é escrita anônima sem teto: um laço com hashes aleatórios enche
-- `cadastros_ip` até o limite de 500 MB do plano gratuito, e aí o banco inteiro
-- para. Não vaza dado de ninguém; derruba o bar.
--
-- A tabela fica (tem o histórico e não faz mal); as funções saem.
-- ============================================================

drop function if exists public.cadastros_feitos_pelo_ip(text);
drop function if exists public.registrar_cadastro_do_ip(text);

comment on table public.cadastros_ip is
  'Histórico do antigo cadastro público (migration 0007). Sem função de acesso desde a 0011 — mantida só como registro.';
