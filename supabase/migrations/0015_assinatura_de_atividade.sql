-- ButecoApp — uma assinatura barata do que o dono está vendo.
-- Idempotente.

-- ============================================================
-- Por quê
--
-- As telas do dono se atualizavam sozinhas recarregando a rota inteira a cada
-- 5 segundos. Funciona, mas é caro (uma renderização completa no servidor por
-- ciclo, mudando algo ou não) e lento demais para quem está com a tela na
-- frente: um produto cadastrado no celular demorava até 5 s para aparecer no
-- caixa.
--
-- Esta função devolve um md5 do que aquele bar enxerga. O navegador pergunta
-- por ela de 1,5 em 1,5 s — uma consulta pequena, resposta de 32 caracteres — e
-- só manda recarregar a tela quando o valor MUDA. Fica mais rápido e mais
-- barato ao mesmo tempo.
--
-- `security invoker` de propósito: a função não enxerga nada além do que o RLS
-- já deixaria o próprio usuário ver. Ela não é uma porta nova para o dado, é o
-- mesmo dado resumido.
--
-- Sobre o recorte: não existe `updated_at` em lugar nenhum do schema, então
-- data de criação não detectaria EDIÇÃO. Por isso o md5 é do conteúdo. Para
-- não crescer sem limite com o histórico do bar, entram só as comandas abertas
-- (de qualquer data) e as dos últimos 3 dias — e isso é correto, não atalho:
-- desde a migration 0013 comanda fechada é imutável, e reabrir uma antiga a
-- devolve para o conjunto por `status = 'aberta'`.
-- ============================================================

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
    ) t(linha);
$$;

-- Visitante anônimo não tem o que assinar aqui.
revoke all on function public.atividade_do_bar() from anon;
grant execute on function public.atividade_do_bar() to authenticated;
