-- Read-only audit of a Neon branch. Run in a READ ONLY transaction:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f neon/auditoria.sql
-- Output is aggregate: counts and md5 fingerprints of sorted ids, no e-mails,
-- hashes or names. Compare section 1 with the Supabase origin fingerprint
-- recorded in MIGRACAO_NEON.md (same formula on both sides).
BEGIN READ ONLY;

\echo '== 0. Onde estou (confira antes de ler o resto)'
SELECT current_database() AS db, current_user AS role, inet_server_addr() AS addr,
       current_setting('neon.branch_id', true) AS neon_branch, now() AS lido_em;

\echo '== 1. Impressão digital por tabela'
SELECT 'public.users' t, count(*) n, md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')) ids_md5,
       count(*) FILTER (WHERE password_hash IS NULL) sem_senha,
       count(*) FILTER (WHERE suspended_at IS NOT NULL) suspensos FROM public.users
UNION ALL SELECT 'public.administradores', count(*), md5(coalesce(string_agg(user_id::text, ',' ORDER BY user_id), '')), NULL, NULL FROM public.administradores
UNION ALL SELECT 'public.bars', count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')), NULL, NULL FROM public.bars
UNION ALL SELECT 'public.clientes', count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')), NULL, NULL FROM public.clientes
UNION ALL SELECT 'public.produtos', count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')), NULL, NULL FROM public.produtos
UNION ALL SELECT 'public.lancamentos', count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')), NULL, NULL FROM public.lancamentos
UNION ALL SELECT 'public.pagamentos', count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')), NULL, NULL FROM public.pagamentos
UNION ALL SELECT 'public.pedidos_pendentes', count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')), NULL, NULL FROM public.pedidos_pendentes
UNION ALL SELECT 'public.interessados', count(*), md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')), NULL, NULL FROM public.interessados;

\echo '== 1b. Usuários do Neon AUSENTES na origem (o "oitavo"): só data e vínculos, sem e-mail'
-- The seven origin Auth ids hash to 8e5eb93ed5a2b692f6a33337be9cd105 when sorted.
-- Print each Neon user's creation date and links so the extra one can be explained.
SELECT u.created_at, u.password_hash IS NULL AS sem_senha,
       EXISTS (SELECT 1 FROM public.bars b WHERE b.owner_id = u.id) AS tem_bar,
       EXISTS (SELECT 1 FROM public.administradores a WHERE a.user_id = u.id) AS eh_admin,
       u.last_login_at, u.email_verified_at
  FROM public.users u ORDER BY u.created_at;

\echo '== 2. Órfãos (deve ser tudo zero)'
SELECT
  (SELECT count(*) FROM public.bars b LEFT JOIN public.users u ON u.id = b.owner_id WHERE u.id IS NULL) bars_sem_dono,
  (SELECT count(*) FROM public.administradores a LEFT JOIN public.users u ON u.id = a.user_id WHERE u.id IS NULL) admin_sem_usuario,
  (SELECT count(*) FROM public.clientes c LEFT JOIN public.bars b ON b.id = c.bar_id WHERE b.id IS NULL) comandas_sem_bar,
  (SELECT count(*) FROM public.lancamentos l JOIN public.clientes c ON c.id = l.cliente_id
     JOIN public.produtos p ON p.id = l.produto_id WHERE p.bar_id <> c.bar_id) lancamento_produto_de_outro_bar,
  (SELECT count(*) FROM public.pedidos_pendentes pp JOIN public.clientes c ON c.id = pp.cliente_id
     WHERE c.bar_id <> pp.bar_id) pedido_comanda_de_outro_bar,
  (SELECT count(*) FROM public.comandas_resumo WHERE status = 'fechada' AND restante_centavos <> 0) fechadas_com_saldo,
  (SELECT count(*) FROM public.comandas_resumo WHERE restante_centavos < 0) saldo_negativo;

\echo '== 3. Referências de mídia fora do R2'
SELECT 'bars.foto_url' campo, split_part(foto_url, '/', 3) host, count(*) FROM public.bars
 WHERE foto_url IS NOT NULL GROUP BY 2
UNION ALL SELECT 'produtos.imagem_url', split_part(imagem_url, '/', 3), count(*) FROM public.produtos
 WHERE imagem_url IS NOT NULL GROUP BY 2;

\echo '== 4. Migrations registradas (compare com sha256sum neon/migrations/*.sql)'
SELECT name, sha256, applied_at FROM app_private.schema_migrations ORDER BY name;

\echo '== 5. Esquema: tabelas, donos, RLS'
SELECT n.nspname, c.relname, c.relkind, pg_get_userbyid(c.relowner) dono, c.relrowsecurity rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname IN ('public', 'app_private') AND c.relkind IN ('r', 'v', 'm')
 ORDER BY 1, 2;

\echo '== 6. Constraints (PK, FK com ação, UNIQUE, CHECK)'
SELECT conrelid::regclass tabela, conname, contype, pg_get_constraintdef(oid) def
  FROM pg_constraint WHERE connamespace IN ('public'::regnamespace, 'app_private'::regnamespace)
 ORDER BY 1, 2;

\echo '== 7. Índices'
SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes
 WHERE schemaname IN ('public', 'app_private') ORDER BY 1, 2, 3;

\echo '== 8. Triggers'
SELECT tgrelid::regclass tabela, tgname, tgenabled, pg_get_triggerdef(oid) FROM pg_trigger
 WHERE NOT tgisinternal ORDER BY 1, 2;

\echo '== 9. Grants em tabelas e funções (quem além do dono pode o quê)'
SELECT table_schema, table_name, grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) priv
  FROM information_schema.role_table_grants
 WHERE table_schema IN ('public', 'app_private') GROUP BY 1, 2, 3 ORDER BY 1, 2, 3;
SELECT n.nspname, p.proname, pg_get_userbyid(p.proowner) dono, p.prosecdef security_definer,
       coalesce(array_to_string(p.proacl, ' '), '(padrão: PUBLIC executa)') acl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname IN ('public', 'app_private') ORDER BY 1, 2;

\echo '== 10. Sessões e fatores (0005 aplicada?)'
SELECT to_regclass('app_private.sessions') IS NOT NULL AS tabela_sessions,
       (SELECT count(*) FROM app_private.mfa_factors WHERE confirmed_at IS NOT NULL) mfa_ativos;

ROLLBACK;
