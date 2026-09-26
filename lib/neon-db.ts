import "server-only";

import { Pool, types } from "pg";

// Server components pass timestamps to client components as ISO strings.
types.setTypeParser(1184, value => new Date(value).toISOString());

const connectionString = (process.env.DATABASE_URL || "")
  .replace("postgresql+psycopg://", "postgresql://")
  .replace("postgresql+asyncpg://", "postgresql://");

/** A single pool per server process; callers must never expose its credentials. */
export const neonPool = new Pool({ connectionString });
