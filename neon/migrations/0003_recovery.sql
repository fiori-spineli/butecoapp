ALTER TABLE app_private.password_recovery
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

CREATE INDEX IF NOT EXISTS auth_rate_limits_window_idx
  ON app_private.auth_rate_limits(window_start);
