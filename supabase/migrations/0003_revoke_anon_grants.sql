-- ButecoApp — tirar do role `anon` os grants de tabela.
--
-- Por padrão o Supabase concede SELECT/INSERT/UPDATE/DELETE em todas as tabelas
-- do schema public para `anon` e `authenticated`. Hoje isso não vaza nada: o RLS
-- está ligado em todas as tabelas e não existe policy nenhuma para `anon`, então
-- toda consulta anônima volta vazia.
--
-- Só que "volta vazia" e "não tem permissão" são coisas diferentes. Com o grant
-- de pé, basta um dia alguém criar uma policy permissiva demais, ou desligar o
-- RLS de uma tabela por engano, para o anônimo passar a ler tudo — o banco
-- inteiro fica dependendo de uma camada só. E o README já afirmava que "o cliente
-- anônimo não tem SELECT em tabela nenhuma", o que não era literalmente verdade.
--
-- O app anônimo (app/c/[token]) só chama comanda_publica() via RPC, que é
-- SECURITY DEFINER e roda como postgres — não depende de grant nenhum do anon.
-- `authenticated` mantém os grants: é por eles + RLS que o dono acessa o bar.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;

-- comanda_publica é a exceção deliberada: é a API pública da comanda.
grant execute on function public.comanda_publica(uuid) to anon;

-- Tabelas criadas depois desta migration não devem reintroduzir o grant.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
