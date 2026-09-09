-- ButecoApp — cadastro protegido e manutenção que faz o que promete.
-- Idempotente.

-- ============================================================
-- 1. Um cadastro por IP
--
-- Confirmação de e-mail resolve endereço inventado, mas não resolve alguém
-- com dez endereços reais abrindo dez bares. O IP é o único sinal que temos
-- de graça, e ele basta para o que precisamos aqui: frear criação em massa.
--
-- Guardamos o SHA-256 do IP, nunca o IP. Serve para comparar (é tudo o que
-- precisamos) e não vira um cadastro de endereços de rede dos nossos usuários
-- caso o banco vaze. O sal fica na aplicação.
-- ============================================================

create table if not exists public.cadastros_ip (
  ip_hash     text primary key,
  total       integer not null default 0,
  primeiro_em timestamptz not null default now(),
  ultimo_em   timestamptz not null default now()
);

alter table public.cadastros_ip enable row level security;

-- Nenhuma policy de propósito: com RLS ligada e zero policy, a tabela é
-- inacessível pela API para qualquer role. O único caminho são as duas
-- funções abaixo, que rodam como dono.
revoke all on public.cadastros_ip from anon, authenticated;

/**
 * Quantos cadastros já saíram deste IP. Só lê — o cadastro que falhar por
 * outro motivo (e-mail já existe, senha curta) não pode queimar a cota.
 */
create or replace function public.cadastros_feitos_pelo_ip(p_ip_hash text)
returns integer
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(
    (select total from public.cadastros_ip where ip_hash = p_ip_hash),
    0
  );
$$;

/** Registra um cadastro concluído. Chamada só depois do signup dar certo. */
create or replace function public.registrar_cadastro_do_ip(p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Hash de 64 hex ou nada: evita encher a tabela com lixo se a rota for
  -- chamada com qualquer coisa.
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return;
  end if;

  insert into public.cadastros_ip (ip_hash, total)
  values (p_ip_hash, 1)
  on conflict (ip_hash) do update
    set total     = public.cadastros_ip.total + 1,
        ultimo_em = now();
end;
$$;

revoke all on function public.cadastros_feitos_pelo_ip(text) from public;
revoke all on function public.registrar_cadastro_do_ip(text)  from public;
grant execute on function public.cadastros_feitos_pelo_ip(text) to anon, authenticated;
grant execute on function public.registrar_cadastro_do_ip(text) to anon, authenticated;

-- ============================================================
-- 2. Manutenção do banco: fazer o que o botão diz
--
-- A versão anterior chamava pg_stat_reset(), que não limpa tupla morta nem
-- reindexa nada — ela APAGA os contadores de estatística, justamente os dados
-- que o Performance Advisor usa para dizer qual índice está sendo usado. O
-- botão destruía telemetria e chamava isso de manutenção.
--
-- VACUUM não pode rodar dentro de função (é comando de transação própria), e
-- o autovacuum já cuida disso sozinho. O que sobra de útil e seguro daqui é
-- ANALYZE: recalcula as estatísticas do planejador, que é o que faz o Postgres
-- escolher o plano certo depois de muita escrita.
-- ============================================================

create or replace function public.admin_executar_manutencao(p_acao text)
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_eh_admin boolean;
  v_tabela   text;
  v_total    integer := 0;
begin
  select exists(select 1 from public.administradores where user_id = auth.uid())
    into v_eh_admin;

  if not v_eh_admin then
    raise exception 'Acesso negado. Requer privilégios de administrador.';
  end if;

  if p_acao = 'analisar' then
    foreach v_tabela in array array[
      'bars', 'clientes', 'produtos', 'lancamentos', 'pagamentos'
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

-- O grant estava faltando no banco: a função existia e negava execução para
-- todo mundo, então o botão do painel dava erro em vez de rodar.
revoke all on function public.admin_executar_manutencao(text) from public;
grant execute on function public.admin_executar_manutencao(text) to authenticated;
