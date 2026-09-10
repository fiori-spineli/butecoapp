-- ButecoApp — vitrine pública, fila de interessados e datas visíveis.
-- Idempotente: pode rodar mais de uma vez.

-- ============================================================
-- 1. Quem é admin — em um lugar só
--
-- As policies abaixo precisam da mesma pergunta que as funções do painel já
-- fazem ("esse auth.uid() está em administradores?"). Repetir o EXISTS em cada
-- policy funciona, mas cada cópia é uma chance de esquecer de mudar junto.
-- ============================================================

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (select 1 from public.administradores where user_id = auth.uid());
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to authenticated;

-- ============================================================
-- 2. Fila de interessados
--
-- O cadastro público morreu: ninguém mais cria bar sozinho. Quem se interessa
-- deixa o contato aqui e a conta nasce no backoffice, feita por nós. Isso
-- fecha a porta por onde um robô criaria milhares de contas — não existe mais
-- porta, existe fila.
-- ============================================================

create table if not exists public.interessados (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  bar_nome    text not null,
  email       text not null,
  telefone    text not null,
  cidade      text,
  mensagem    text,
  -- SHA-256 do IP com o sal do ambiente, nunca o IP. Mesma decisão da 0007.
  ip_hash     text,
  status      text not null default 'novo'
              check (status in ('novo', 'contatado', 'convertido', 'descartado')),
  observacao  text,
  atendido_em timestamptz,
  bar_id      uuid references public.bars on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists interessados_status_idx on public.interessados (status, created_at desc);
create index if not exists interessados_ip_idx     on public.interessados (ip_hash, created_at desc);

alter table public.interessados enable row level security;

drop policy if exists "admin le os interessados"       on public.interessados;
drop policy if exists "admin atualiza os interessados" on public.interessados;

-- Só admin lê e atualiza. Não existe policy de INSERT de propósito: quem
-- grava é a função abaixo, que roda como dono e é o único caminho de entrada.
create policy "admin le os interessados"
  on public.interessados for select to authenticated
  using (public.eh_admin());

create policy "admin atualiza os interessados"
  on public.interessados for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

revoke all on public.interessados from anon;

--
-- Entrada da fila.
--
-- Executável só por `service_role` — de propósito. A chave anônima é pública
-- (vai no navegador), então tudo que `anon` pode executar, um robô também
-- pode, direto na API, sem passar pelo meu formulário. Com o grant só para o
-- service_role, o único caminho é a server action, que antes disso já conferiu
-- o Turnstile e o honeypot.
--
-- O limite por IP fica aqui dentro, e não só na aplicação, porque é a última
-- linha: se um dia essa função for exposta por engano, o teto vem junto.
--
create or replace function public.registrar_interesse(
  p_nome     text,
  p_bar_nome text,
  p_email    text,
  p_telefone text,
  p_cidade   text default null,
  p_mensagem text default null,
  p_ip_hash  text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_nome     text := btrim(p_nome);
  v_bar      text := btrim(p_bar_nome);
  v_email    text := lower(btrim(p_email));
  v_telefone text := btrim(p_telefone);
begin
  if v_nome = '' or v_bar = '' or v_email = '' or v_telefone = '' then
    return 'faltando';
  end if;

  -- Teto de tamanho no banco também: o formulário já limita, mas quem grava é
  -- quem tem de garantir. Sem isso, uma chamada direta enche a tabela com
  -- megabytes de texto.
  if length(v_nome) > 120 or length(v_bar) > 120 or length(v_email) > 254
     or length(v_telefone) > 30 or length(coalesce(p_cidade, '')) > 120
     or length(coalesce(p_mensagem, '')) > 2000 then
    return 'tamanho';
  end if;

  -- Três pedidos por conexão por dia. Não é 1 pelo mesmo motivo da 0007:
  -- operadora de celular põe muita gente atrás do mesmo IP.
  if p_ip_hash is not null and (
    select count(*) from public.interessados
     where ip_hash = p_ip_hash and created_at > now() - interval '24 hours'
  ) >= 3 then
    return 'limite';
  end if;

  -- Mandou duas vezes no mesmo dia: não é erro dele nem pedido novo nosso.
  if exists (
    select 1 from public.interessados
     where email = v_email and created_at > now() - interval '24 hours'
  ) then
    return 'duplicado';
  end if;

  insert into public.interessados (nome, bar_nome, email, telefone, cidade, mensagem, ip_hash)
  values (v_nome, v_bar, v_email, v_telefone,
          nullif(btrim(coalesce(p_cidade, '')), ''),
          nullif(btrim(coalesce(p_mensagem, '')), ''),
          p_ip_hash);

  return 'ok';
end;
$$;

-- `from public` não basta: o Supabase mantém um default privilege que dá
-- EXECUTE a `authenticated` em toda função nova do schema. Sem o revoke
-- explícito, qualquer dono de bar logado poderia encher a fila de pedidos.
revoke all on function public.registrar_interesse(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_interesse(text, text, text, text, text, text, text) to service_role;

-- ============================================================
-- 3. Produto sem preço deixa de ser possível
--
-- O check nasceu como >= 0, o que aceita um produto de R$ 0,00 — que na tela
-- do cliente aparece como item de graça e na conta soma nada. Nenhum produto
-- de verdade custa zero; quem quer dar cortesia registra o pagamento, não o
-- preço. Conferido antes de apertar: nenhuma linha em produção tem zero.
-- ============================================================

alter table public.produtos drop constraint if exists produtos_preco_centavos_check;
alter table public.produtos add  constraint produtos_preco_centavos_check check (preco_centavos > 0);

-- ============================================================
-- 4. A comanda pública passa a dizer QUANDO
--
-- A hora de cada pedido já existia no banco (lancamentos.created_at) e nunca
-- saía para o cliente. É a informação que resolve a discussão de balcão —
-- "isso aí eu não pedi" — e ela serve aos dois lados dele.
-- ============================================================

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
    'itens',             v_itens
  );
end;
$$;

revoke all on function public.comanda_publica(uuid) from public;
grant execute on function public.comanda_publica(uuid) to anon, authenticated;
