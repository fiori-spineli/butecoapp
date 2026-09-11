-- ButecoApp — sai a última sobra do auto-cadastro.
-- Idempotente.

-- A 0011 removeu as funções que escreviam em `cadastros_ip` e deixou a tabela
-- "como registro". Auditoria de 2026-09-11: o registro era uma linha — um hash
-- de IP de quem se cadastrou quando o cadastro público existia. Hash de IP é
-- dado pessoal por tabela (dá para confirmar um IP suspeito contra ele), e
-- ninguém consulta isso. Sem função, sem tela, sem política: só o linter do
-- Supabase apontando "RLS ligado sem política". Guardar dado pessoal sem uso
-- é o contrário do que a página de privacidade promete.

drop table if exists public.cadastros_ip;
