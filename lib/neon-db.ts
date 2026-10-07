import "server-only";

import { attachDatabasePool } from "@vercel/functions/db-connections";
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

/**
 * A single pool per server process; callers must never expose its credentials.
 *
 * Every wait has a deadline (GUARDRAILS §12). pg's default connectionTimeoutMillis
 * is 0 — wait forever — so an exhausted pool used to hang requests until the
 * function itself timed out. Now a request that cannot get a connection in 5 s
 * fails and the page shows the error boundary. DATABASE_URL points at Neon's
 * pooler, so a small per-instance ceiling is enough; the pooler fans out.
 */
export const neonPool = new Pool({
  connectionString,
  max: 5,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 10_000,
});

// With Fluid compute one instance serves many requests and may be suspended with
// clients still open; this releases idle clients before that. No-op elsewhere.
attachDatabasePool(neonPool);
