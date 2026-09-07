-- ButecoApp — correções apontadas pelos advisors do Supabase.
-- Para bancos que já rodaram a 0001 na versão anterior. Idempotente.

-- ============================================================
-- 1. public_bucket_allows_listing
--
-- A 0001 criava uma policy de SELECT ampla em storage.objects para o bucket
-- público. Bucket público já entrega os arquivos por
-- /storage/v1/object/public/... sem passar por RLS — a policy só servia para
-- permitir LISTAR o bucket inteiro. Trocada por uma que deixa o dono listar
-- apenas a pasta do próprio bar.
-- ============================================================

drop policy if exists "imagens de produto sao publicas" on storage.objects;
drop policy if exists "dono lista imagens do proprio bar" on storage.objects;

create policy "dono lista imagens do proprio bar"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'produtos-imagens'
    and (storage.foldername(name))[1] in (select id::text from public.bars where owner_id = auth.uid())
  );

-- ============================================================
-- 2. comanda_publica: marcada como STABLE (só lê)
--
-- Continua SECURITY DEFINER e executável por anon/authenticated — é a API
-- pública da comanda, e é o que permite o anônimo NÃO ter SELECT em tabela
-- nenhuma. Os advisors 0028/0029 seguem aparecendo para ela: é intencional.
-- ============================================================

alter function public.comanda_publica(uuid) stable;

-- ============================================================
-- 3. rls_auto_enable(): guarda-corpo que não veio deste projeto
--
-- Identificada: é a função do event trigger `ensure_rls` (ddl_command_end),
-- que liga RLS automaticamente em toda tabela criada no schema public. Não veio
-- de nenhuma migration daqui, e também não é da plataforma — os event triggers
-- do Supabase pertencem a `supabase_admin`, e esta pertence a `postgres`, ou
-- seja, foi criada por alguém rodando SQL no projeto. É inofensiva e até útil,
-- então fica. O alerta do advisor sobre ela é falso positivo: função de event
-- trigger não é chamável por fora (`select rls_auto_enable()` só dá erro).
-- Ainda assim tiramos o EXECUTE de anon/authenticated — ninguém de fora precisa
-- dela, e o disparo do event trigger não depende desse privilégio.
-- ============================================================

do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from anon, authenticated, public';
  end if;
end
$$;
