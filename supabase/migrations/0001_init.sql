-- BotecoApp — schema inicial
-- Aplicar no SQL Editor do projeto Supabase (ou via `supabase db push`).
-- Idempotente: pode ser rodado mais de uma vez.

create extension if not exists "pgcrypto";

-- ============================================================
-- Tabelas
-- ============================================================

create table if not exists public.bars (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users on delete cascade,
  nome       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  bar_id      uuid not null references public.bars on delete cascade,
  nome        text not null,
  numero_mesa text,
  token       uuid not null unique default gen_random_uuid(),
  status      text not null default 'aberta' check (status in ('aberta', 'fechada')),
  fechada_em  timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.produtos (
  id             uuid primary key default gen_random_uuid(),
  bar_id         uuid not null references public.bars on delete cascade,
  nome           text not null,
  preco_centavos integer not null check (preco_centavos >= 0),
  imagem_url     text,
  created_at     timestamptz not null default now()
);

create table if not exists public.lancamentos (
  id                      uuid primary key default gen_random_uuid(),
  cliente_id              uuid not null references public.clientes on delete cascade,
  produto_id              uuid references public.produtos on delete set null,
  descricao               text,
  quantidade              integer not null default 1 check (quantidade > 0),
  valor_unitario_centavos integer not null check (valor_unitario_centavos >= 0),
  created_at              timestamptz not null default now()
);

create table if not exists public.pagamentos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes on delete cascade,
  lancamento_id   uuid references public.lancamentos on delete cascade,
  quantidade_paga integer check (quantidade_paga > 0),
  valor_centavos  integer not null check (valor_centavos > 0),
  descricao       text,
  created_at      timestamptz not null default now()
);

create index if not exists clientes_bar_id_idx     on public.clientes (bar_id);
create index if not exists clientes_token_idx      on public.clientes (token);
create index if not exists produtos_bar_id_idx     on public.produtos (bar_id);
create index if not exists lancamentos_cliente_idx on public.lancamentos (cliente_id);
create index if not exists pagamentos_cliente_idx  on public.pagamentos (cliente_id);
create index if not exists pagamentos_lancto_idx   on public.pagamentos (lancamento_id);

-- ============================================================
-- Row Level Security — isolamento multi-tenant
--
-- Todo acesso do dono passa por auth.uid(); o cliente (anônimo) NÃO
-- recebe SELECT em tabela nenhuma — ver função comanda_publica() abaixo.
-- ============================================================

alter table public.bars        enable row level security;
alter table public.clientes    enable row level security;
alter table public.produtos    enable row level security;
alter table public.lancamentos enable row level security;
alter table public.pagamentos  enable row level security;

drop policy if exists "dono acessa seu bar"          on public.bars;
drop policy if exists "dono acessa seus clientes"    on public.clientes;
drop policy if exists "dono acessa seus produtos"    on public.produtos;
drop policy if exists "dono acessa seus lancamentos" on public.lancamentos;
drop policy if exists "dono acessa seus pagamentos"  on public.pagamentos;

create policy "dono acessa seu bar"
  on public.bars for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "dono acessa seus clientes"
  on public.clientes for all to authenticated
  using (bar_id in (select id from public.bars where owner_id = auth.uid()))
  with check (bar_id in (select id from public.bars where owner_id = auth.uid()));

create policy "dono acessa seus produtos"
  on public.produtos for all to authenticated
  using (bar_id in (select id from public.bars where owner_id = auth.uid()))
  with check (bar_id in (select id from public.bars where owner_id = auth.uid()));

create policy "dono acessa seus lancamentos"
  on public.lancamentos for all to authenticated
  using (
    cliente_id in (
      select c.id from public.clientes c
      join public.bars b on b.id = c.bar_id
      where b.owner_id = auth.uid()
    )
  )
  with check (
    cliente_id in (
      select c.id from public.clientes c
      join public.bars b on b.id = c.bar_id
      where b.owner_id = auth.uid()
    )
  );

create policy "dono acessa seus pagamentos"
  on public.pagamentos for all to authenticated
  using (
    cliente_id in (
      select c.id from public.clientes c
      join public.bars b on b.id = c.bar_id
      where b.owner_id = auth.uid()
    )
  )
  with check (
    cliente_id in (
      select c.id from public.clientes c
      join public.bars b on b.id = c.bar_id
      where b.owner_id = auth.uid()
    )
  );

-- ============================================================
-- View de apoio para a tela do dono: comanda + totais já somados.
-- security_invoker = on faz a view respeitar o RLS de quem consulta.
-- ============================================================

create or replace view public.comandas_resumo
with (security_invoker = on) as
select
  c.id,
  c.bar_id,
  c.nome,
  c.numero_mesa,
  c.token,
  c.status,
  c.fechada_em,
  c.created_at,
  coalesce(l.total_centavos, 0)::bigint                                as total_centavos,
  coalesce(p.pago_centavos, 0)::bigint                                 as pago_centavos,
  (coalesce(l.total_centavos, 0) - coalesce(p.pago_centavos, 0))::bigint as restante_centavos,
  coalesce(l.itens, 0)::bigint                                         as itens
from public.clientes c
left join lateral (
  select sum(quantidade * valor_unitario_centavos) as total_centavos,
         count(*)                                  as itens
    from public.lancamentos
   where cliente_id = c.id
) l on true
left join lateral (
  select sum(valor_centavos) as pago_centavos
    from public.pagamentos
   where cliente_id = c.id
) p on true;

-- ============================================================
-- Acesso público do cliente (sem login)
--
-- Em vez de dar SELECT anônimo na tabela clientes (o que permitiria
-- listar TODAS as comandas abertas de TODOS os bares via API), o acesso
-- é feito por esta função: ela exige o token e devolve só aquela comanda,
-- já respeitando a janela de 24h após o fechamento.
-- ============================================================

--
-- Nota sobre os advisors "…security_definer_function_executable": esta função
-- é SECURITY DEFINER e executável por anon/authenticated DE PROPÓSITO — ela é
-- a API pública da comanda. É justamente o que permite não dar SELECT anônimo
-- nas tabelas. Ela só devolve a comanda cujo token foi informado, e o token é
-- um UUID aleatório (não enumerável).
--
create or replace function public.comanda_publica(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cliente public.clientes%rowtype;
  v_bar_nome text;
  v_total bigint;
  v_pago bigint;
  v_itens jsonb;
begin
  select * into v_cliente from public.clientes where token = p_token;
  if not found then
    return null;
  end if;

  -- token expira 24h depois do fechamento da conta
  if v_cliente.status = 'fechada'
     and (v_cliente.fechada_em is null or now() - v_cliente.fechada_em >= interval '24 hours') then
    return null;
  end if;

  select nome into v_bar_nome from public.bars where id = v_cliente.bar_id;

  select coalesce(sum(l.quantidade * l.valor_unitario_centavos), 0)
    into v_total
    from public.lancamentos l
   where l.cliente_id = v_cliente.id;

  select coalesce(sum(p.valor_centavos), 0)
    into v_pago
    from public.pagamentos p
   where p.cliente_id = v_cliente.id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id',                      l.id,
               'nome',                    coalesce(pr.nome, l.descricao, 'Item'),
               'descricao_livre',         (l.produto_id is null),
               'imagem_url',              pr.imagem_url,
               'quantidade',              l.quantidade,
               'valor_unitario_centavos', l.valor_unitario_centavos,
               'total_centavos',          l.quantidade * l.valor_unitario_centavos
             )
             order by l.created_at
           ),
           '[]'::jsonb
         )
    into v_itens
    from public.lancamentos l
    left join public.produtos pr on pr.id = l.produto_id
   where l.cliente_id = v_cliente.id;

  return jsonb_build_object(
    'bar_nome',          v_bar_nome,
    'cliente_nome',      v_cliente.nome,
    'numero_mesa',       v_cliente.numero_mesa,
    'status',            v_cliente.status,
    'fechada_em',        v_cliente.fechada_em,
    'total_centavos',    v_total,
    'pago_centavos',     v_pago,
    'restante_centavos', v_total - v_pago,
    'itens',             v_itens
  );
end;
$$;

revoke all on function public.comanda_publica(uuid) from public;
grant execute on function public.comanda_publica(uuid) to anon, authenticated;

-- ============================================================
-- Storage — imagens de produto (sempre .webp)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('produtos-imagens', 'produtos-imagens', true)
on conflict (id) do nothing;

drop policy if exists "imagens de produto sao publicas"      on storage.objects;
drop policy if exists "dono sobe imagens do proprio bar"     on storage.objects;
drop policy if exists "dono atualiza imagens do proprio bar" on storage.objects;
drop policy if exists "dono apaga imagens do proprio bar"    on storage.objects;
drop policy if exists "dono lista imagens do proprio bar"    on storage.objects;

-- Sem policy de SELECT ampla aqui de propósito: bucket público já serve os
-- arquivos por /storage/v1/object/public/... sem passar por RLS. Uma policy
-- de SELECT liberada permitiria LISTAR todo o bucket (advisor
-- public_bucket_allows_listing). O dono lista só a própria pasta:
create policy "dono lista imagens do proprio bar"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'produtos-imagens'
    and (storage.foldername(name))[1] in (select id::text from public.bars where owner_id = auth.uid())
  );

create policy "dono sobe imagens do proprio bar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'produtos-imagens'
    and (storage.foldername(name))[1] in (select id::text from public.bars where owner_id = auth.uid())
  );

create policy "dono atualiza imagens do proprio bar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'produtos-imagens'
    and (storage.foldername(name))[1] in (select id::text from public.bars where owner_id = auth.uid())
  );

create policy "dono apaga imagens do proprio bar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'produtos-imagens'
    and (storage.foldername(name))[1] in (select id::text from public.bars where owner_id = auth.uid())
  );
