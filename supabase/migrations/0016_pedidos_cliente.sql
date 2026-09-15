-- ButecoApp — Pedidos feitos pelo cliente via QR Code com aprovação do dono
-- Migration 0016: Tabela de pedidos pendentes, funções de pedido e confirmação

-- 1. Tabela de pedidos pendentes
create table if not exists public.pedidos_pendentes (
  id                      uuid primary key default gen_random_uuid(),
  bar_id                  uuid not null references public.bars on delete cascade,
  cliente_id              uuid not null references public.clientes on delete cascade,
  produto_id              uuid not null references public.produtos on delete cascade,
  quantidade              integer not null default 1 check (quantidade > 0 and quantidade <= 99),
  valor_unitario_centavos integer not null check (valor_unitario_centavos > 0),
  status                  text not null default 'pendente' check (status in ('pendente', 'entregue', 'cancelado')),
  created_at              timestamptz not null default now(),
  atendido_em             timestamptz
);

create index if not exists pedidos_pendentes_bar_idx on public.pedidos_pendentes (bar_id, status);
create index if not exists pedidos_pendentes_cliente_idx on public.pedidos_pendentes (cliente_id, status);

alter table public.pedidos_pendentes enable row level security;

-- O dono acessa os pedidos pendentes do seu bar
create policy "dono acessa pedidos pendentes do seu bar"
  on public.pedidos_pendentes for all to authenticated
  using (
    bar_id in (select id from public.bars where owner_id = (select auth.uid()))
  )
  with check (
    bar_id in (select id from public.bars where owner_id = (select auth.uid()))
  );

revoke all on public.pedidos_pendentes from anon;

-- 2. Função pública para o cliente enviar pedidos usando o token da comanda
create or replace function public.fazer_pedido_cliente(
  p_token uuid,
  p_itens jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_cliente public.clientes%rowtype;
  v_item jsonb;
  v_produto_id uuid;
  v_qtd integer;
  v_preco integer;
  v_total_pedidos integer := 0;
begin
  select * into v_cliente from public.clientes where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'mensagem', 'Comanda não encontrada.');
  end if;

  if v_cliente.status <> 'aberta' then
    return jsonb_build_object('ok', false, 'mensagem', 'Esta comanda já foi fechada.');
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto_id := (v_item->>'produto_id')::uuid;
    v_qtd := coalesce((v_item->>'quantidade')::integer, 1);

    if v_qtd <= 0 or v_qtd > 99 then
      continue;
    end if;

    -- Garante que o produto pertence ao mesmo bar da comanda
    select preco_centavos into v_preco
      from public.produtos
     where id = v_produto_id and bar_id = v_cliente.bar_id;

    if v_preco is not null then
      insert into public.pedidos_pendentes (
        bar_id,
        cliente_id,
        produto_id,
        quantidade,
        valor_unitario_centavos
      ) values (
        v_cliente.bar_id,
        v_cliente.id,
        v_produto_id,
        v_qtd,
        v_preco
      );
      v_total_pedidos := v_total_pedidos + 1;
    end if;
  end loop;

  if v_total_pedidos = 0 then
    return jsonb_build_object('ok', false, 'mensagem', 'Nenhum item válido para pedir.');
  end if;

  return jsonb_build_object('ok', true, 'pedidos', v_total_pedidos);
end;
$$;

revoke all on function public.fazer_pedido_cliente(uuid, jsonb) from public;
grant execute on function public.fazer_pedido_cliente(uuid, jsonb) to anon, authenticated;

-- 3. Função para o dono confirmar entrega e lançar oficialmente na conta
create or replace function public.confirmar_entrega_pedido(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_pedido public.pedidos_pendentes%rowtype;
  v_eh_dono boolean;
begin
  select * into v_pedido from public.pedidos_pendentes where id = p_pedido_id;
  if not found then
    return jsonb_build_object('ok', false, 'mensagem', 'Pedido não encontrado.');
  end if;

  if v_pedido.status <> 'pendente' then
    return jsonb_build_object('ok', false, 'mensagem', 'Este pedido já foi processado.');
  end if;

  -- Checa se o usuário logado é dono do bar
  select exists (
    select 1 from public.bars where id = v_pedido.bar_id and owner_id = auth.uid()
  ) into v_eh_dono;

  if not v_eh_dono then
    return jsonb_build_object('ok', false, 'mensagem', 'Acesso não autorizado.');
  end if;

  -- Lança item oficialmente na comanda
  insert into public.lancamentos (
    cliente_id,
    produto_id,
    quantidade,
    valor_unitario_centavos
  ) values (
    v_pedido.cliente_id,
    v_pedido.produto_id,
    v_pedido.quantidade,
    v_pedido.valor_unitario_centavos
  );

  -- Atualiza o pedido pendente
  update public.pedidos_pendentes
     set status = 'entregue', atendido_em = now()
   where id = p_pedido_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.confirmar_entrega_pedido(uuid) from public, anon;
grant execute on function public.confirmar_entrega_pedido(uuid) to authenticated;

-- 4. Função para o dono recusar/cancelar pedido pendente
create or replace function public.recusar_pedido_pendente(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_pedido public.pedidos_pendentes%rowtype;
  v_eh_dono boolean;
begin
  select * into v_pedido from public.pedidos_pendentes where id = p_pedido_id;
  if not found then
    return jsonb_build_object('ok', false, 'mensagem', 'Pedido não encontrado.');
  end if;

  select exists (
    select 1 from public.bars where id = v_pedido.bar_id and owner_id = auth.uid()
  ) into v_eh_dono;

  if not v_eh_dono then
    return jsonb_build_object('ok', false, 'mensagem', 'Acesso não autorizado.');
  end if;

  update public.pedidos_pendentes
     set status = 'cancelado', atendido_em = now()
   where id = p_pedido_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.recusar_pedido_pendente(uuid) from public, anon;
grant execute on function public.recusar_pedido_pendente(uuid) to authenticated;

-- 5. Atualiza comanda_publica para devolver o cardápio e pedidos pendentes
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
  v_cardapio jsonb;
  v_pedidos_pendentes jsonb;
begin
  select * into v_cliente from public.clientes where token = p_token;
  if not found then
    return null;
  end if;

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
               'total_centavos',          l.quantidade * l.valor_unitario_centavos,
               'criado_em',               l.created_at
             )
             order by l.created_at
           ),
           '[]'::jsonb
         )
    into v_itens
    from public.lancamentos l
    left join public.produtos pr on pr.id = l.produto_id
   where l.cliente_id = v_cliente.id;

  -- Cardápio do bar
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', pr.id,
               'nome', pr.nome,
               'preco_centavos', pr.preco_centavos,
               'imagem_url', pr.imagem_url
             )
             order by pr.nome asc
           ),
           '[]'::jsonb
         )
    into v_cardapio
    from public.produtos pr
   where pr.bar_id = v_cliente.bar_id;

  -- Pedidos pendentes do cliente
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', pp.id,
               'nome', pr.nome,
               'quantidade', pp.quantidade,
               'valor_unitario_centavos', pp.valor_unitario_centavos,
               'status', pp.status,
               'created_at', pp.created_at
             )
             order by pp.created_at desc
           ),
           '[]'::jsonb
         )
    into v_pedidos_pendentes
    from public.pedidos_pendentes pp
    join public.produtos pr on pr.id = pp.produto_id
   where pp.cliente_id = v_cliente.id and pp.status = 'pendente';

  return jsonb_build_object(
    'bar_nome',          v_bar_nome,
    'cliente_nome',      v_cliente.nome,
    'numero_mesa',       v_cliente.numero_mesa,
    'status',            v_cliente.status,
    'aberta_em',         v_cliente.created_at,
    'fechada_em',        v_cliente.fechada_em,
    'total_centavos',    v_total,
    'pago_centavos',     v_pago,
    'restante_centavos', v_total - v_pago,
    'itens',             v_itens,
    'cardapio',          v_cardapio,
    'pedidos_pendentes', v_pedidos_pendentes
  );
end;
$$;

revoke all on function public.comanda_publica(uuid) from public;
grant execute on function public.comanda_publica(uuid) to anon, authenticated;

-- 6. Atualiza atividade_do_bar para detectar novos pedidos no polling do dono na hora
create or replace function public.atividade_do_bar()
returns text
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with comandas as (
    select id, nome, status,
           coalesce(numero_mesa, '') as mesa,
           coalesce(fechada_em::text, '') as fechada
      from public.clientes
     where status = 'aberta'
        or created_at > now() - interval '3 days'
  )
  select md5(coalesce(string_agg(linha, '|' order by linha), 'vazio'))
    from (
      select 'c:' || id || ':' || nome || ':' || status || ':' || mesa || ':' || fechada as linha
        from comandas
      union all
      select 'i:' || l.id || ':' || l.quantidade || ':' || l.valor_unitario_centavos
             || ':' || coalesce(l.descricao, '') || ':' || coalesce(l.produto_id::text, '')
        from public.lancamentos l
        join comandas c on c.id = l.cliente_id
      union all
      select 'g:' || p.id || ':' || p.valor_centavos || ':' || coalesce(p.descricao, '')
        from public.pagamentos p
        join comandas c on c.id = p.cliente_id
      union all
      select 'p:' || id || ':' || nome || ':' || preco_centavos || ':' || coalesce(imagem_url, '')
        from public.produtos
      union all
      select 'ped:' || id || ':' || status || ':' || quantidade
        from public.pedidos_pendentes
       where status = 'pendente'
    ) t(linha);
$$;