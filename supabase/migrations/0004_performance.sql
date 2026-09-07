-- ButecoApp — correções apontadas pelo Performance Advisor. Idempotente.

-- ============================================================
-- 1. auth_rls_initplan (5 policies)
--
-- `auth.uid()` escrito solto numa policy é reavaliado UMA VEZ POR LINHA
-- examinada. Envolvendo em `(select auth.uid())`, o planejador o trata como
-- InitPlan: executa uma vez e reusa o resultado na varredura inteira.
--
-- A semântica não muda — auth.uid() é estável dentro da transação. O que muda
-- é o custo, e ele cresce com o tamanho da tabela: hoje, com um bar e três
-- lançamentos, é irrelevante; num bar com meses de comanda, não é.
-- ============================================================

drop policy if exists "dono acessa seu bar" on public.bars;
create policy "dono acessa seu bar"
  on public.bars for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "dono acessa seus clientes" on public.clientes;
create policy "dono acessa seus clientes"
  on public.clientes for all to authenticated
  using (bar_id in (select id from public.bars where owner_id = (select auth.uid())))
  with check (bar_id in (select id from public.bars where owner_id = (select auth.uid())));

drop policy if exists "dono acessa seus produtos" on public.produtos;
create policy "dono acessa seus produtos"
  on public.produtos for all to authenticated
  using (bar_id in (select id from public.bars where owner_id = (select auth.uid())))
  with check (bar_id in (select id from public.bars where owner_id = (select auth.uid())));

drop policy if exists "dono acessa seus lancamentos" on public.lancamentos;
create policy "dono acessa seus lancamentos"
  on public.lancamentos for all to authenticated
  using (
    cliente_id in (
      select c.id from public.clientes c
        join public.bars b on b.id = c.bar_id
       where b.owner_id = (select auth.uid())
    )
  )
  with check (
    cliente_id in (
      select c.id from public.clientes c
        join public.bars b on b.id = c.bar_id
       where b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "dono acessa seus pagamentos" on public.pagamentos;
create policy "dono acessa seus pagamentos"
  on public.pagamentos for all to authenticated
  using (
    cliente_id in (
      select c.id from public.clientes c
        join public.bars b on b.id = c.bar_id
       where b.owner_id = (select auth.uid())
    )
  )
  with check (
    cliente_id in (
      select c.id from public.clientes c
        join public.bars b on b.id = c.bar_id
       where b.owner_id = (select auth.uid())
    )
  );

-- ============================================================
-- 2. unindexed_foreign_keys
--
-- bars.owner_id: consultado em TODA requisição autenticada (exigirBar) e
-- dentro das policies acima. É o índice mais usado do schema.
--
-- lancamentos.produto_id: sustenta o `on delete set null` — sem ele, apagar
-- um produto varre a tabela de lançamentos inteira.
-- ============================================================

create index if not exists bars_owner_id_idx       on public.bars (owner_id);
create index if not exists lancamentos_produto_idx on public.lancamentos (produto_id);

-- ============================================================
-- 3. unused_index em pagamentos_lancto_idx: NÃO removido de propósito.
--
-- Ele está "sem uso" porque o app mal rodou — a divisão de conta, que é quem
-- consulta pagamentos por lancamento_id, nunca foi exercitada. Remover agora
-- seria otimizar em cima de estatística vazia.
-- ============================================================
