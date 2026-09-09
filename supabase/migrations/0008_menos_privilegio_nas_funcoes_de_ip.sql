-- ButecoApp — menos privilégio nas funções de limite por IP. Idempotente.
--
-- As duas só rodam durante o cadastro, quando ainda não existe sessão — ou
-- seja, sempre como `anon`. Dar EXECUTE também para `authenticated` era
-- privilégio sem uso, e cada grant desses vira um warning no Security Advisor.

revoke execute on function public.cadastros_feitos_pelo_ip(text) from authenticated;
revoke execute on function public.registrar_cadastro_do_ip(text)  from authenticated;
