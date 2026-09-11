-- ButecoApp — as regras da comanda passam a valer no banco, não só na tela.
-- Idempotente.

-- ============================================================
-- Por quê
--
-- Auditoria de 2026-09-11 achou em produção uma comanda FECHADA com total
-- R$ 14,00 e pago R$ 18,75 — saldo de −R$ 4,75. O item foi removido depois do
-- acerto de fechamento. Nenhuma tela oferece isso; bastou a sequência certa de
-- ações, todas individualmente permitidas.
--
-- As server actions checam o saldo antes de gravar, mas:
--   1. duas requisições ao mesmo tempo passam as duas na checagem (race);
--   2. nada impedia lançar item, remover item ou desfazer pagamento em comanda
--      já fechada — e comanda fechada é o comprovante que o cliente guarda;
--   3. a checagem mora em cada action; uma action nova que esqueça dela abre o
--      buraco de novo.
--
-- Trigger resolve os três: roda em toda escrita, venha de onde vier, e com
-- FOR UPDATE na linha da comanda serializa as concorrentes.
--
-- pg_trigger_depth() > 1 = disparo vindo de cascata de chave estrangeira
-- (excluir cliente no backoffice, apagar produto com ON DELETE SET NULL). Esses
-- passam direto: não são operação de balcão, são faxina estrutural.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Centavos em reais, para a mensagem de recusa ser legível.
-- ------------------------------------------------------------
create or replace function public.reais(p_centavos bigint)
returns text
language sql
immutable
set search_path = public, pg_catalog
as $$
  select 'R$ ' || replace(to_char(p_centavos / 100.0, 'FM999999999990.00'), '.', ',');
$$;

-- ------------------------------------------------------------
-- 1. Pagamento: só em comanda aberta, e nunca além do total.
-- ------------------------------------------------------------
create or replace function public.trg_pagamento_valido()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_status text;
  v_total  bigint;
  v_pago   bigint;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  -- Tranca a comanda até o fim da transação: dois pagamentos simultâneos
  -- passam a entrar um depois do outro, e o segundo vê o primeiro.
  select status into v_status
    from public.clientes
   where id = new.cliente_id
     for update;

  if v_status is null then
    raise exception 'Comanda não encontrada.' using errcode = 'P0002';
  end if;

  if v_status <> 'aberta' then
    raise exception 'A comanda está fechada. Reabra antes de registrar pagamento.'
      using errcode = 'check_violation';
  end if;

  select coalesce(sum(quantidade * valor_unitario_centavos), 0) into v_total
    from public.lancamentos where cliente_id = new.cliente_id;

  select coalesce(sum(valor_centavos), 0) into v_pago
    from public.pagamentos where cliente_id = new.cliente_id;

  if v_pago + new.valor_centavos > v_total then
    raise exception 'Esse pagamento (%) passa do que falta na conta (%).',
      public.reais(new.valor_centavos), public.reais(v_total - v_pago)
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists pagamento_valido on public.pagamentos;
create trigger pagamento_valido
  before insert on public.pagamentos
  for each row execute function public.trg_pagamento_valido();

-- ------------------------------------------------------------
-- 2. Desfazer pagamento: só em comanda aberta.
-- ------------------------------------------------------------
create or replace function public.trg_pagamento_remocao()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_status text;
begin
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  select status into v_status from public.clientes where id = old.cliente_id for update;

  -- Comanda já não existe (cascata em curso) ou não é visível: deixa passar,
  -- a chave estrangeira e o RLS cuidam do resto.
  if v_status is null then
    return old;
  end if;

  if v_status <> 'aberta' then
    raise exception 'A comanda está fechada. Reabra antes de desfazer pagamento.'
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists pagamento_remocao on public.pagamentos;
create trigger pagamento_remocao
  before delete on public.pagamentos
  for each row execute function public.trg_pagamento_remocao();

-- ------------------------------------------------------------
-- 3. Lançar item: só em comanda aberta.
-- ------------------------------------------------------------
create or replace function public.trg_lancamento_valido()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_status text;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  select status into v_status from public.clientes where id = new.cliente_id for update;

  if v_status is null then
    raise exception 'Comanda não encontrada.' using errcode = 'P0002';
  end if;

  if v_status <> 'aberta' then
    raise exception 'A comanda está fechada. Reabra antes de lançar item.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists lancamento_valido on public.lancamentos;
create trigger lancamento_valido
  before insert or update on public.lancamentos
  for each row execute function public.trg_lancamento_valido();

-- ------------------------------------------------------------
-- 4. Remover item: só em comanda aberta, e nunca abaixo do que já foi pago.
-- ------------------------------------------------------------
create or replace function public.trg_lancamento_remocao()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_status text;
  v_total  bigint;
  v_pago   bigint;
begin
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  select status into v_status from public.clientes where id = old.cliente_id for update;

  if v_status is null then
    return old;
  end if;

  if v_status <> 'aberta' then
    raise exception 'A comanda está fechada. Reabra antes de remover item.'
      using errcode = 'check_violation';
  end if;

  select coalesce(sum(quantidade * valor_unitario_centavos), 0) into v_total
    from public.lancamentos where cliente_id = old.cliente_id and id <> old.id;

  select coalesce(sum(valor_centavos), 0) into v_pago
    from public.pagamentos where cliente_id = old.cliente_id;

  if v_pago > v_total then
    raise exception 'Esse item já está coberto por pagamento. Desfaça o pagamento antes de removê-lo.'
      using errcode = 'check_violation';
  end if;

  return old;
end;
$$;

drop trigger if exists lancamento_remocao on public.lancamentos;
create trigger lancamento_remocao
  before delete on public.lancamentos
  for each row execute function public.trg_lancamento_remocao();

-- ------------------------------------------------------------
-- 5. Tetos de tamanho e de valor.
--
-- Texto sem teto é convite a encher o banco: um nome de comanda de 1 MB grava
-- sem reclamar. E quantidade de 2 bilhões cabe num integer mas não cabe em bar
-- nenhum. Nenhuma linha de produção viola nada disto (maior nome hoje: 42).
-- ------------------------------------------------------------
alter table public.bars       drop constraint if exists bars_nome_tamanho;
alter table public.bars       add  constraint bars_nome_tamanho check (char_length(nome) between 1 and 120);

alter table public.clientes   drop constraint if exists clientes_nome_tamanho;
alter table public.clientes   add  constraint clientes_nome_tamanho check (char_length(nome) between 1 and 80);
alter table public.clientes   drop constraint if exists clientes_mesa_tamanho;
alter table public.clientes   add  constraint clientes_mesa_tamanho check (numero_mesa is null or char_length(numero_mesa) <= 20);

alter table public.produtos   drop constraint if exists produtos_nome_tamanho;
alter table public.produtos   add  constraint produtos_nome_tamanho check (char_length(nome) between 1 and 120);
alter table public.produtos   drop constraint if exists produtos_preco_teto;
alter table public.produtos   add  constraint produtos_preco_teto check (preco_centavos <= 10000000);

alter table public.lancamentos drop constraint if exists lancamentos_descricao_tamanho;
alter table public.lancamentos add  constraint lancamentos_descricao_tamanho check (descricao is null or char_length(descricao) <= 120);
alter table public.lancamentos drop constraint if exists lancamentos_quantidade_teto;
alter table public.lancamentos add  constraint lancamentos_quantidade_teto check (quantidade <= 999);
alter table public.lancamentos drop constraint if exists lancamentos_valor_teto;
alter table public.lancamentos add  constraint lancamentos_valor_teto check (valor_unitario_centavos <= 10000000);
-- Item de graça deixa de existir aqui também, como já não existe em produtos.
alter table public.lancamentos drop constraint if exists lancamentos_valor_unitario_centavos_check;
alter table public.lancamentos add  constraint lancamentos_valor_unitario_centavos_check check (valor_unitario_centavos > 0);

alter table public.pagamentos drop constraint if exists pagamentos_descricao_tamanho;
alter table public.pagamentos add  constraint pagamentos_descricao_tamanho check (descricao is null or char_length(descricao) <= 120);
alter table public.pagamentos drop constraint if exists pagamentos_valor_teto;
alter table public.pagamentos add  constraint pagamentos_valor_teto check (valor_centavos <= 100000000);
