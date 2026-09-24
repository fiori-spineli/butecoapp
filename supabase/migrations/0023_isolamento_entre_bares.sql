-- ButecoApp — cada bar só enxerga e só escreve no que é dele.
-- Idempotente: pode rodar mais de uma vez.

-- ============================================================
-- Por quê
--
-- Auditoria de 2026-09-24. Os achados foram confirmados em produção, com
-- impersonação dentro de uma transação que foi desfeita. O mais grave foi este:
--
--   O dono de um bar lançou R$ 9,9 milhões na comanda de OUTRO bar.
--
-- Como aconteceu: a policy de `pedidos_pendentes` conferia só o `bar_id`.
-- O dono gravou direto pela API um pedido com o bar_id DELE e o `cliente_id`
-- da comanda alheia. Depois chamou `confirmar_entrega_pedido`, que é SECURITY
-- DEFINER e por isso passa por cima do RLS. A função conferiu que o bar do
-- pedido era dele e gravou em `lancamentos` o cliente_id que estava na linha.
-- O RLS de `lancamentos` nunca foi consultado.
--
-- A lição é a da 0013 (GUARDRAILS §5 e §6): regra que mora só na tela ou só
-- numa função não é regra. Aqui ela vira estrutura: chave estrangeira
-- composta, grant revogado e trigger. As funções também conferem por dentro,
-- porque dentro de uma função SECURITY DEFINER o RLS não protege ninguém.
--
-- Blocos:
--    1. pedidos_pendentes: comanda e produto presos ao bar do próprio pedido
--    2. pedidos_pendentes: o dono só LÊ; quem escreve são as funções
--    3. confirmar / recusar: trava na linha e conferência por dentro
--    4. fazer_pedido_cliente: o teto de 40 deixa de furar com paralelismo
--    5. lancamentos e pagamentos: referência a outro bar é recusada
--    6. bars: o dono lê e edita; criar e apagar fica só com o admin
--    7. bars e produtos: teto nos campos de texto livre e na URL de foto
--    8. comanda_publica e atividade_do_bar: produção volta a bater com o repo
--    9. Storage: só WebP, com teto de tamanho
--   10. Quem executa cada função (revoke explícito, GUARDRAILS §7)
--   11. Índice na chave estrangeira que faltava
--
-- Depois de aplicar: get_advisors(security) e get_advisors(performance).
-- ============================================================


-- ============================================================
-- 1. Pedido preso ao próprio bar, pela estrutura da tabela
--
-- Achado [ALTO] de 2026-09-24: IDOR entre bares via pedidos_pendentes.
--
-- As chaves estrangeiras eram simples (cliente_id -> clientes, produto_id ->
-- produtos). Elas garantiam que a comanda EXISTE, não que é do mesmo bar do
-- pedido. Com a chave composta (cliente_id, bar_id) -> clientes (id, bar_id),
-- um pedido com a comanda de outro bar não entra na tabela, venha de onde
-- vier: da API, de uma função SECURITY DEFINER com bug, da service role ou de
-- SQL escrito à mão.
--
-- Não basta apertar a policy: policy não vale para quem roda como dono da
-- tabela, que é o caso das funções SECURITY DEFINER. Foi por elas que o
-- ataque passou.
--
-- A chave composta precisa de um UNIQUE (id, bar_id) do outro lado. Como `id`
-- já é único sozinho, o par é único por definição; o índice existe só para a
-- chave estrangeira ter onde se apoiar.
--
-- Raio de cascata (GUARDRAILS §1), o mesmo de antes com as chaves novas:
--   bars     --ON DELETE CASCADE-->  pedidos_pendentes  (bar_id, sem mudança)
--   clientes --ON DELETE CASCADE-->  pedidos_pendentes  (cliente_id, bar_id)
--   produtos --ON DELETE CASCADE-->  pedidos_pendentes  (produto_id, bar_id)
-- Apagar um produto continua levando junto o histórico de pedidos dele
-- (entregues e recusados). O que foi entregue fica guardado em `lancamentos`,
-- que usa ON DELETE SET NULL e não perde a linha.
--
-- As chaves simples antigas SAEM; não ficam ao lado das novas. Com duas chaves
-- entre pedidos_pendentes e produtos, o embed `produtos(nome)` que a tela da
-- comanda faz pelo PostgREST fica ambíguo e deixa de funcionar.
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.clientes'::regclass
                    and conname  = 'clientes_id_bar_id_key') then
    alter table public.clientes add constraint clientes_id_bar_id_key unique (id, bar_id);
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.produtos'::regclass
                    and conname  = 'produtos_id_bar_id_key') then
    alter table public.produtos add constraint produtos_id_bar_id_key unique (id, bar_id);
  end if;
end
$$;

alter table public.pedidos_pendentes drop constraint if exists pedidos_pendentes_cliente_id_fkey;
alter table public.pedidos_pendentes drop constraint if exists pedidos_pendentes_produto_id_fkey;

alter table public.pedidos_pendentes drop constraint if exists pedidos_pendentes_cliente_do_mesmo_bar;
alter table public.pedidos_pendentes
  add constraint pedidos_pendentes_cliente_do_mesmo_bar
  foreign key (cliente_id, bar_id) references public.clientes (id, bar_id) on delete cascade;

alter table public.pedidos_pendentes drop constraint if exists pedidos_pendentes_produto_do_mesmo_bar;
alter table public.pedidos_pendentes
  add constraint pedidos_pendentes_produto_do_mesmo_bar
  foreign key (produto_id, bar_id) references public.produtos (id, bar_id) on delete cascade;

-- Os índices são criados junto com as chaves. O de produto também fecha o
-- advisor unindexed_foreign_keys (pedidos_pendentes_produto_id_fkey): sem
-- ele, apagar um produto percorre a tabela de pedidos inteira.
--
-- O índice antigo (cliente_id, status) sai porque o novo cobre as mesmas
-- consultas. A tela do dono, a comanda_publica e o teto de 40 filtram por
-- cliente_id + status. O bar_id no meio não atrapalha, porque cada comanda
-- tem um bar só.
drop index if exists public.pedidos_pendentes_cliente_idx;
create index if not exists pedidos_pendentes_cliente_bar_idx
  on public.pedidos_pendentes (cliente_id, bar_id, status);
create index if not exists pedidos_pendentes_produto_bar_idx
  on public.pedidos_pendentes (produto_id, bar_id);


-- ============================================================
-- 2. pedidos_pendentes: o dono só lê
--
-- A policy era FOR ALL, e o grant era o padrão do Supabase: tudo, inclusive
-- TRUNCATE, que nem passa pelo RLS. Pela sessão do dono, o app só LÊ esta
-- tabela (app/(dashboard)/comanda/[id]/page.tsx). Toda escrita passa por
-- fazer_pedido_cliente, confirmar_entrega_pedido e recusar_pedido_pendente,
-- que são SECURITY DEFINER e não dependem do grant de quem chama. A escrita
-- direta só servia de porta para o ataque.
--
-- service_role mantém os grants que tem (é o admin).
-- ============================================================

drop policy if exists "dono acessa pedidos pendentes do seu bar" on public.pedidos_pendentes;
drop policy if exists "dono le os pedidos do seu bar"            on public.pedidos_pendentes;

create policy "dono le os pedidos do seu bar"
  on public.pedidos_pendentes for select to authenticated
  using (bar_id in (select id from public.bars where owner_id = (select auth.uid())));

revoke all on public.pedidos_pendentes from anon, authenticated;
grant select on public.pedidos_pendentes to authenticated;


-- ============================================================
-- 3. Confirmar e recusar: uma vez só, e só no que é do bar
--
-- Achados de 2026-09-24:
--   [ALTO]  confirmar_entrega_pedido lançava na comanda que estivesse na linha
--           do pedido, sem conferir se ela era do mesmo bar (bloco 1).
--   [MÉDIO] O pedido era lido sem FOR UPDATE. Com dois cliques (ou duas abas)
--           as duas chamadas liam 'pendente' e o item entrava DUAS vezes na
--           conta. É o problema da 0013 de novo: duas requisições ao mesmo
--           tempo passam as duas na checagem.
--
-- Agora:
--   - FOR UPDATE no pedido. A segunda chamada espera a primeira terminar e,
--     quando lê, já encontra 'entregue'.
--   - Primeiro confere o dono, depois o estado. Quem não é dono não fica
--     sabendo se o pedido de outro bar já foi atendido.
--   - A comanda e o produto do pedido têm de ser do bar do pedido. Isso repete
--     de propósito a chave do bloco 1: esta função roda como dono da tabela e
--     grava dinheiro. Se um dia a chave cair ou for trocada, a conferência
--     continua aqui.
--   - Comanda fechada vira recado legível. O trigger de lancamentos já
--     recusava, mas com erro cru, que a tela mostrava como "Falha ao
--     confirmar entrega".
--
-- A ordem das travas é pedido -> comanda. fazer_pedido_cliente trava só a
-- comanda e insere pedidos novos, sem esperar a trava de pedido nenhum, então
-- as duas funções não se bloqueiam em ciclo.
-- ============================================================

create or replace function public.confirmar_entrega_pedido(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_pedido         public.pedidos_pendentes%rowtype;
  v_status_comanda text;
begin
  select * into v_pedido
    from public.pedidos_pendentes
   where id = p_pedido_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'mensagem', 'Pedido não encontrado.');
  end if;

  if not exists (
    select 1 from public.bars where id = v_pedido.bar_id and owner_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'mensagem', 'Acesso não autorizado.');
  end if;

  if v_pedido.status <> 'pendente' then
    return jsonb_build_object('ok', false, 'mensagem', 'Este pedido já foi processado.');
  end if;

  select status into v_status_comanda
    from public.clientes
   where id = v_pedido.cliente_id and bar_id = v_pedido.bar_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'mensagem', 'Esse pedido não é de uma comanda deste bar.');
  end if;

  if not exists (
    select 1 from public.produtos where id = v_pedido.produto_id and bar_id = v_pedido.bar_id
  ) then
    return jsonb_build_object('ok', false, 'mensagem', 'Esse pedido não é do cardápio deste bar.');
  end if;

  if v_status_comanda <> 'aberta' then
    return jsonb_build_object('ok', false, 'mensagem', 'A comanda está fechada. Reabra antes de confirmar o pedido.');
  end if;

  insert into public.lancamentos (cliente_id, produto_id, quantidade, valor_unitario_centavos)
  values (v_pedido.cliente_id, v_pedido.produto_id, v_pedido.quantidade, v_pedido.valor_unitario_centavos);

  update public.pedidos_pendentes
     set status = 'entregue', atendido_em = now()
   where id = v_pedido.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.confirmar_entrega_pedido(uuid) from public, anon;
grant execute on function public.confirmar_entrega_pedido(uuid) to authenticated;

-- Recusar não mexe em dinheiro, mas tinha dois defeitos. Não travava a linha,
-- e aceitava recusar um pedido JÁ ENTREGUE: o item continuava na conta e o
-- cliente recebia "pedido recusado". Agora só um pedido pendente pode ser
-- recusado, uma vez.
create or replace function public.recusar_pedido_pendente(p_pedido_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_pedido public.pedidos_pendentes%rowtype;
begin
  select * into v_pedido
    from public.pedidos_pendentes
   where id = p_pedido_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'mensagem', 'Pedido não encontrado.');
  end if;

  if not exists (
    select 1 from public.bars where id = v_pedido.bar_id and owner_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'mensagem', 'Acesso não autorizado.');
  end if;

  if v_pedido.status <> 'pendente' then
    return jsonb_build_object('ok', false, 'mensagem', 'Este pedido já foi processado.');
  end if;

  if not exists (
    select 1 from public.clientes where id = v_pedido.cliente_id and bar_id = v_pedido.bar_id
  ) then
    return jsonb_build_object('ok', false, 'mensagem', 'Esse pedido não é de uma comanda deste bar.');
  end if;

  update public.pedidos_pendentes
     set status = 'cancelado', atendido_em = now()
   where id = v_pedido.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.recusar_pedido_pendente(uuid) from public, anon;
grant execute on function public.recusar_pedido_pendente(uuid) to authenticated;


-- ============================================================
-- 4. fazer_pedido_cliente: o teto da fila vale com chamadas em paralelo
--
-- Achado [BAIXO] de 2026-09-24. A 0021 conta os pedidos pendentes sem travar
-- a comanda. N chamadas simultâneas com o mesmo token veem todas "menos de
-- 40" e gravam até 40 cada uma. Não chega ao saldo, porque o pedido espera o
-- dono confirmar, mas o teto que protege a tela do garçom no meio do
-- movimento deixava de valer justamente no abuso.
--
-- A única mudança em relação à 0021 é o FOR UPDATE na linha da comanda: a
-- segunda chamada espera a primeira terminar e conta o que ela gravou. A trava
-- dura só a chamada.
-- ============================================================

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
  v_pendentes integer;
  ITENS_POR_PEDIDO constant integer := 50;
  PENDENTES_POR_COMANDA constant integer := 40;
begin
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    return jsonb_build_object('ok', false, 'mensagem', 'Pedido inválido.');
  end if;

  if jsonb_array_length(p_itens) > ITENS_POR_PEDIDO then
    return jsonb_build_object(
      'ok', false,
      'mensagem', 'Esse pedido tem itens demais de uma vez. Faça em partes.'
    );
  end if;

  select * into v_cliente
    from public.clientes
   where token = p_token
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'mensagem', 'Comanda não encontrada.');
  end if;

  if v_cliente.status <> 'aberta' then
    return jsonb_build_object('ok', false, 'mensagem', 'Esta comanda já foi fechada.');
  end if;

  select count(*) into v_pendentes
    from public.pedidos_pendentes
   where cliente_id = v_cliente.id and status = 'pendente';

  if v_pendentes >= PENDENTES_POR_COMANDA then
    return jsonb_build_object(
      'ok', false,
      'mensagem', 'Você já tem pedidos esperando. Chame o garçom antes de pedir mais.'
    );
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    exit when v_pendentes + v_total_pedidos >= PENDENTES_POR_COMANDA;

    v_produto_id := (v_item->>'produto_id')::uuid;
    v_qtd := coalesce((v_item->>'quantidade')::integer, 1);

    if v_qtd <= 0 or v_qtd > 99 then
      continue;
    end if;

    -- O produto tem de ser do mesmo bar da comanda. Desde o bloco 1, a chave
    -- composta também garante isso.
    select preco_centavos into v_preco
      from public.produtos
     where id = v_produto_id and bar_id = v_cliente.bar_id;

    if v_preco is not null then
      insert into public.pedidos_pendentes (
        bar_id, cliente_id, produto_id, quantidade, valor_unitario_centavos
      ) values (
        v_cliente.bar_id, v_cliente.id, v_produto_id, v_qtd, v_preco
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

comment on function public.fazer_pedido_cliente(uuid, jsonb) is
  'Pedido do cliente pelo QR. Executável por anon DE PROPÓSITO (advisor 0028): a trava é o token UUID da comanda, o preço vem do banco e o pedido espera o dono confirmar. Tetos: 50 itens por chamada, 40 pendentes por comanda (com FOR UPDATE).';

revoke all on function public.fazer_pedido_cliente(uuid, jsonb) from public;
grant execute on function public.fazer_pedido_cliente(uuid, jsonb) to anon, authenticated;


-- ============================================================
-- 5. lancamentos e pagamentos: nada aponta para outro bar
--
-- Achado [BAIXO] de 2026-09-24, provado com impersonação. O dono de um bar
-- gravou, na própria comanda:
--   - um lançamento com produto_id de OUTRO bar. A comanda_publica passava a
--     mostrar ao cliente dele o nome e a foto do produto alheio.
--   - um pagamento com lancamento_id de um item de OUTRA comanda.
-- As policies conferem só o cliente_id da própria linha. A chave estrangeira
-- é simples e só garante que o outro lado existe.
--
-- A conferência entra nos triggers da 0013, que já rodam em toda escrita e já
-- travam a comanda. `lancamentos` não tem bar_id, então a chave composta do
-- bloco 1 não serve aqui.
--
-- O trigger roda com o papel de quem escreve (security invoker). Para o dono,
-- um produto de outro bar nem aparece por causa do RLS, e ele é recusado do
-- mesmo jeito. Dentro de uma função SECURITY DEFINER, a comparação explícita
-- de bar_id é o que decide.
-- ============================================================

create or replace function public.trg_lancamento_valido()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_status text;
  v_bar_id uuid;
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  select status, bar_id into v_status, v_bar_id
    from public.clientes
   where id = new.cliente_id
     for update;

  if v_status is null then
    raise exception 'Comanda não encontrada.' using errcode = 'P0002';
  end if;

  if v_status <> 'aberta' then
    raise exception 'A comanda está fechada. Reabra antes de lançar item.'
      using errcode = 'check_violation';
  end if;

  if new.produto_id is not null and not exists (
    select 1 from public.produtos where id = new.produto_id and bar_id = v_bar_id
  ) then
    raise exception 'Esse produto não é do cardápio deste bar.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

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

  if new.lancamento_id is not null and not exists (
    select 1 from public.lancamentos
     where id = new.lancamento_id and cliente_id = new.cliente_id
  ) then
    raise exception 'Esse item não é desta comanda.'
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

-- Nenhuma tela EDITA lançamento ou pagamento: o dono corrige apagando e
-- lançando de novo (app/actions/comandas.ts só faz insert e delete). O UPDATE
-- era uma porta lateral para tudo o que a 0013 fechou. O trigger de pagamento
-- só roda no INSERT, então por UPDATE dava para trocar o valor de um
-- pagamento numa comanda FECHADA ou apontar lancamento_id para outra comanda
-- depois de gravar. Sem o grant, a porta deixa de existir.
--
-- TRUNCATE, REFERENCES e TRIGGER saem de todas as tabelas que esta migration
-- toca. Nenhuma tela usa, e TRUNCATE nem passa pelo RLS.
revoke all on public.lancamentos from anon, authenticated;
grant select, insert, delete on public.lancamentos to authenticated;

revoke all on public.pagamentos from anon, authenticated;
grant select, insert, delete on public.pagamentos to authenticated;

revoke all on public.clientes from anon, authenticated;
grant select, insert, update, delete on public.clientes to authenticated;

revoke all on public.produtos from anon, authenticated;
grant select, insert, update, delete on public.produtos to authenticated;


-- ============================================================
-- 6. bars: o dono lê e edita o próprio bar; criar e apagar é do admin
--
-- Achado [BAIXO→MÉDIO] de 2026-09-24. A policy era FOR ALL. Qualquer conta
-- autenticada sem bar CRIAVA um bar pela API (provado com a conta de QA) e
-- APAGAVA o próprio bar. Apagar leva junto, por cascata, comandas, produtos,
-- lançamentos, pagamentos e pedidos (GUARDRAILS §1), sem PITR no plano free.
--
-- No app, bar nasce e morre só pela chave de serviço: `admin.from("bars")` em
-- app/actions/clientes.ts, e excluir cliente apaga o usuário, que leva o bar.
-- O comentário de app/onboarding/page.tsx já dizia "bar nasce em um lugar só:
-- o painel de admin". Agora o banco também diz.
--
-- O UPDATE é liberado por COLUNA. owner_id, id e created_at ficam de fora, e
-- trocar o dono dá 42501 antes mesmo de chegar à policy. A policy de UPDATE
-- continua exigindo owner_id = auth.uid() dos dois lados, como segunda camada.
-- Coluna nova que o dono precise editar tem de entrar nesta lista. Se não
-- entrar, o erro é alto (permissão negada), não silencioso.
-- ============================================================

drop policy if exists "dono acessa seu bar"     on public.bars;
drop policy if exists "dono le o proprio bar"    on public.bars;
drop policy if exists "dono edita o proprio bar" on public.bars;

create policy "dono le o proprio bar"
  on public.bars for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "dono edita o proprio bar"
  on public.bars for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- REVOKE ALL na tabela também tira os grants por coluna que já existirem, e
-- isso torna o par revoke/grant idempotente.
revoke all on public.bars from anon, authenticated;
grant select on public.bars to authenticated;
grant update (
  nome, slug, mensagem_qr, horario_abertura, horario_fechamento,
  telefone, cidade, foto_url, acessibilidade
) on public.bars to authenticated;


-- ============================================================
-- 7. Teto nos campos livres do bar e na URL de foto
--
-- Achado [BAIXO] de 2026-09-24, com impersonação do dono: um UPDATE em bars
-- gravou telefone e mensagem_qr de 100.000 caracteres cada,
-- foto_url = 'javascript:alert(1)' e um slug com aspas e quebra de linha.
-- O teto de 300 da mensagem existia só na action (lib/mensagem-qr.ts).
--
-- Os números seguem o que o app já usa: 300 da mensagem (LIMITE_DE_CARACTERES),
-- 30 do telefone e 120 da cidade (os mesmos de registrar_interesse, 0010).
-- O slug segue o formato que gerarSlug (lib/bar.ts) produz: minúsculas,
-- dígitos e hífen, com no máximo 46 caracteres hoje.
--
-- A URL de foto só é aceita se apontar para o bucket deste projeto E para a
-- pasta DO PRÓPRIO BAR, terminando em .webp (GUARDRAILS §11). É o formato
-- exato que app/api/bar/foto e app/api/produtos/imagem gravam. Isso tira do
-- banco a foto de outro bar, a de outro projeto Supabase (o next.config aceita
-- *.supabase.co) e o `javascript:`. O host local (supabase start) está na
-- lista para o ambiente de desenvolvimento continuar funcionando. Se o projeto
-- mudar de host de novo, estas duas constraints mudam junto.
--
-- Conferido em produção antes de escrever: 1 bar e 3 produtos, todos dentro
-- das regras. Por isso as constraints entram validadas, não NOT VALID.
-- ============================================================

alter table public.bars drop constraint if exists bars_slug_formato;
alter table public.bars add  constraint bars_slug_formato
  check (slug ~ '^[a-z0-9][a-z0-9-]{0,59}$');

alter table public.bars drop constraint if exists bars_mensagem_qr_tamanho;
alter table public.bars add  constraint bars_mensagem_qr_tamanho
  check (mensagem_qr is null or char_length(mensagem_qr) <= 300);

alter table public.bars drop constraint if exists bars_telefone_tamanho;
alter table public.bars add  constraint bars_telefone_tamanho
  check (telefone is null or char_length(telefone) <= 30);

alter table public.bars drop constraint if exists bars_cidade_tamanho;
alter table public.bars add  constraint bars_cidade_tamanho
  check (cidade is null or char_length(cidade) <= 120);

-- Hoje a acessibilidade mora no localStorage (lib/acessibilidade.ts) e nada
-- grava nesta coluna. Mas ela continua editável pela API, e jsonb sem teto
-- aceita até 1 GB.
alter table public.bars drop constraint if exists bars_acessibilidade_formato;
alter table public.bars add  constraint bars_acessibilidade_formato
  check (acessibilidade is null
         or (jsonb_typeof(acessibilidade) = 'object' and octet_length(acessibilidade::text) <= 1024));

alter table public.bars drop constraint if exists bars_foto_url_do_proprio_bar;
alter table public.bars add  constraint bars_foto_url_do_proprio_bar
  check (foto_url is null or foto_url ~ (
    '^(https://zmxytngunmyuscmncdmx\.supabase\.co|http://127\.0\.0\.1:54321)'
    || '/storage/v1/object/public/produtos-imagens/'
    || id::text || '/[A-Za-z0-9_-]{1,100}\.webp$'
  ));

alter table public.produtos drop constraint if exists produtos_imagem_url_do_proprio_bar;
alter table public.produtos add  constraint produtos_imagem_url_do_proprio_bar
  check (imagem_url is null or imagem_url ~ (
    '^(https://zmxytngunmyuscmncdmx\.supabase\.co|http://127\.0\.0\.1:54321)'
    || '/storage/v1/object/public/produtos-imagens/'
    || bar_id::text || '/[A-Za-z0-9_-]{1,100}\.webp$'
  ));


-- ============================================================
-- 8. comanda_publica e atividade_do_bar: produção volta a bater com o repo
--
-- Achado [MÉDIO] de 2026-09-24 (deriva): a 0016 consta como aplicada em
-- schema_migrations, mas em produção comanda_publica estava na versão da 0010
-- e atividade_do_bar na da 0015. Não sei por que só essas duas funções
-- ficaram para trás. As outras 13 batem com o repositório. Consequência: o
-- cardápio do cliente vinha vazio (`dados.cardapio ?? []` em
-- app/c/[token]/conta-ao-vivo.tsx), e o dono não via pedido novo chegar
-- sozinho.
--
-- As versões abaixo são as da 0016, com três ajustes conferidos contra o
-- front e contra 0017..0022:
--
--   a) As junções com produtos exigem o MESMO BAR da comanda. A função é
--      SECURITY DEFINER e ignora o RLS. Na prova do achado, um lançamento com
--      produto de outro bar fazia ela devolver o nome e a foto do produto
--      alheio. O bloco 5 impede a linha de nascer; este filtro impede de
--      mostrar uma linha que por acaso já exista.
--   b) pedidos_pendentes também devolve os pedidos RECUSADOS nos últimos 10
--      minutos. O front separa 'pendente' de 'cancelado' e mostra "Pedido
--      recusado pelo bar" (conta-ao-vivo.tsx), mas a versão da 0016 só
--      devolvia os pendentes, então esse aviso nunca aparecia e o pedido
--      recusado sumia sem explicação. Dez minutos bastam para o celular que
--      estava no bolso ver o aviso, e é pouco para o aviso voltar toda vez
--      que a página recarrega.
--   c) atividade_do_bar passa a incluir a categoria (0018) e o estoque (0019)
--      do produto. A tela de produtos mostra os dois, e a 0022 existe para
--      que dois aparelhos ajustando o estoque não se atropelem. Sem isso na
--      assinatura, o ajuste feito no celular não aparecia no caixa.
--
-- Nada de 0017..0022 muda o que a comanda_publica precisa. O cardápio devolve
-- os mesmos quatro campos que lib/types.ts (ComandaPublica.cardapio) declara,
-- sem filtrar por estoque: todo produto nasce com estoque 0 (default da 0019),
-- e filtrar esconderia o cardápio inteiro.
-- ============================================================

create or replace function public.comanda_publica(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
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

  -- O token expira 24h depois do fechamento da conta.
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
    left join public.produtos pr
      on pr.id = l.produto_id and pr.bar_id = v_cliente.bar_id
   where l.cliente_id = v_cliente.id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id',             pr.id,
               'nome',           pr.nome,
               'preco_centavos', pr.preco_centavos,
               'imagem_url',     pr.imagem_url
             )
             order by pr.nome asc
           ),
           '[]'::jsonb
         )
    into v_cardapio
    from public.produtos pr
   where pr.bar_id = v_cliente.bar_id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id',                      pp.id,
               'nome',                    pr.nome,
               'quantidade',              pp.quantidade,
               'valor_unitario_centavos', pp.valor_unitario_centavos,
               'status',                  pp.status,
               'created_at',              pp.created_at
             )
             order by pp.created_at desc
           ),
           '[]'::jsonb
         )
    into v_pedidos_pendentes
    from public.pedidos_pendentes pp
    join public.produtos pr
      on pr.id = pp.produto_id and pr.bar_id = v_cliente.bar_id
   where pp.cliente_id = v_cliente.id
     and (pp.status = 'pendente'
          or (pp.status = 'cancelado' and pp.atendido_em > now() - interval '10 minutes'));

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

comment on function public.comanda_publica(uuid) is
  'API pública da comanda. Executável por anon DE PROPÓSITO (advisor 0028): é o que permite o anônimo não ter SELECT em tabela nenhuma. Só devolve a comanda do token (UUID aleatório) e expira 24h após o fechamento.';

revoke all on function public.comanda_publica(uuid) from public;
grant execute on function public.comanda_publica(uuid) to anon, authenticated;

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
             || ':' || categoria || ':' || estoque_atual
        from public.produtos
      union all
      select 'ped:' || id || ':' || status || ':' || quantidade
        from public.pedidos_pendentes
       where status = 'pendente'
    ) t(linha);
$$;


-- ============================================================
-- 9. Storage: só WebP, e com teto
--
-- Achado [BAIXO] de 2026-09-24. O bucket público `produtos-imagens` não tinha
-- file_size_limit nem allowed_mime_types. Com o próprio JWT, o dono subia
-- qualquer tipo e qualquer tamanho direto pela API do Storage, sem passar
-- pelo sharp e sem o teto de 400 fotos. O resultado ficava servido sob o
-- domínio do projeto.
--
-- O servidor só grava image/webp (app/api/produtos/imagem e app/api/bar/foto).
-- O maior arquivo que ele consegue produzir foi medido com o próprio sharp do
-- projeto, usando ruído puro, que é o pior caso de compressão: 1200×1200 em
-- q78 dá 0,90 MiB, e a logo de 400×400 em q82 dá 0,11 MiB. Foto de verdade
-- fica em dezenas de KB (o maior objeto hoje tem 62 KB). O teto de 2 MiB é o
-- dobro do pior caso possível.
-- ============================================================

update storage.buckets
   set file_size_limit    = 2097152,
       allowed_mime_types = array['image/webp']
 where id = 'produtos-imagens';


-- ============================================================
-- 10. Quem executa cada função
--
-- Achado [INFO] de 2026-09-24. A 0013 e a 0015 fizeram grant para
-- `authenticated` mas não revogaram de PUBLIC. O Postgres dá EXECUTE a PUBLIC
-- em toda função nova, e por isso `anon` executava atividade_do_bar, reais e
-- os trg_* (GUARDRAILS §7).
--
--   atividade_do_bar: só o dono (security invoker; sem sessão não há o que
--                     assinar).
--   reais:            `authenticated` PRECISA continuar executando.
--                     trg_pagamento_valido chama reais() para montar a
--                     mensagem de recusa, e o trigger roda com o papel de
--                     quem escreve. Sem o grant, o dono receberia 42501 no
--                     lugar de "Esse pagamento passa do que falta".
--   trg_*:            ninguém. Função de trigger é disparada pela tabela, não
--                     chamada, e o Postgres não confere EXECUTE no disparo.
--                     Tirar o grant não muda nada no trigger e impede chamar a
--                     função por fora.
-- ============================================================

revoke all on function public.atividade_do_bar() from public, anon;
grant execute on function public.atividade_do_bar() to authenticated;

revoke all on function public.reais(bigint) from public, anon;
grant execute on function public.reais(bigint) to authenticated;

revoke all on function public.trg_lancamento_valido()  from public, anon, authenticated;
revoke all on function public.trg_lancamento_remocao() from public, anon, authenticated;
revoke all on function public.trg_pagamento_valido()   from public, anon, authenticated;
revoke all on function public.trg_pagamento_remocao()  from public, anon, authenticated;


-- ============================================================
-- 11. Índice na chave estrangeira que faltava
--
-- Advisor de performance unindexed_foreign_keys (2026-09-24):
-- interessados_bar_id_fkey (ON DELETE SET NULL). Sem índice, excluir um bar
-- percorre a fila de interessados inteira para anular o vínculo. A outra chave
-- apontada, a de pedidos_pendentes, já ganhou índice no bloco 1.
--
-- interessados_status_idx e interessados_ip_idx aparecem como "não usados",
-- mas ficam. A estatística começou em 2026-08-25 e a fila ainda está vazia,
-- o mesmo raciocínio da 0004 sobre pagamentos_lancto_idx.
-- ============================================================

create index if not exists interessados_bar_idx on public.interessados (bar_id);

-- A tabela também entra na regra dos grants (TRUNCATE ignora o RLS). O admin
-- (authenticated com aal2, via eh_admin) só lê e atualiza a fila, em
-- app/actions/interessados.ts e app/actions/clientes.ts. A entrada é
-- registrar_interesse, que roda como dono da tabela.
revoke all on public.interessados from anon, authenticated;
grant select, update on public.interessados to authenticated;
