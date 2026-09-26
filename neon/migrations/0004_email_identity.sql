-- Login and recovery use case-insensitive email lookups.
-- Refuse the migration if existing identities would become ambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON public.users (lower(email));
