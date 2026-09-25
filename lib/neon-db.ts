import "server-only";

import { Pool } from "pg";

const connectionString = (process.env.DATABASE_URL || "")
  .replace("postgresql+psycopg://", "postgresql://")
  .replace("postgresql+asyncpg://", "postgresql://");

/** A single pool per server process; callers must never expose its credentials. */
export const neonPool = new Pool({ connectionString });
