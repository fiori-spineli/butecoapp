import "server-only";

import { Pool, types } from "pg";

// Server components pass timestamps to client components as ISO strings.
types.setTypeParser(1184, value => new Date(value).toISOString());

/**
 * Neon hands out `sslmode=require`. pg 8 silently treats it as `verify-full`, but
 * pg 9 will switch to libpq semantics, where `require` skips certificate checks.
 * Pin the strict mode now so a dependency bump cannot weaken TLS to the database.
 */
function urlDoBanco(): string {
  const raw = (process.env.DATABASE_URL || "")
    .replace("postgresql+psycopg://", "postgresql://")
    .replace("postgresql+asyncpg://", "postgresql://");
  if (!raw) return raw;
  const url = new URL(raw);
  if (["prefer", "require", "verify-ca"].includes(url.searchParams.get("sslmode") ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

const connectionString = urlDoBanco();

/** A single pool per server process; callers must never expose its credentials. */
export const neonPool = new Pool({ connectionString });
