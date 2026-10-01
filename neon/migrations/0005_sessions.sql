-- Server-side session registry. A signed cookie alone cannot be revoked:
-- logout only deleted it from one browser, so a copied token stayed valid
-- until it expired. Every session token now names a row here, and a request
-- is accepted only while that row is neither revoked nor expired.
CREATE TABLE IF NOT EXISTS app_private.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS sessions_user_active_idx
  ON app_private.sessions(user_id) WHERE revoked_at IS NULL;
-- Retention sweep deletes rows a week after they stop being usable.
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON app_private.sessions(expires_at);

REVOKE ALL ON app_private.sessions FROM PUBLIC;
