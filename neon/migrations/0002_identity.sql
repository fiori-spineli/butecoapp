-- Identity data owned by the application after leaving Supabase Auth.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS bars_owner_unique ON public.bars(owner_id);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'administradores_user_id_fkey'
      AND conrelid = 'public.administradores'::regclass
  ) THEN
    ALTER TABLE public.administradores ADD CONSTRAINT administradores_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;
