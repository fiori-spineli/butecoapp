import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = dirname(fileURLToPath(import.meta.url));
const url = process.env.DATABASE_URL;
const expectedHost = process.env.NEON_EXPECTED_HOST;
if (!url || !expectedHost) {
  throw new Error("DATABASE_URL e NEON_EXPECTED_HOST são obrigatórios.");
}
const host = new URL(url).hostname;
if (host !== expectedHost || host.includes("-pooler")) {
  throw new Error("Migrações exigem a conexão direta da branch esperada.");
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("CREATE SCHEMA IF NOT EXISTS app_private");
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_private.schema_migrations (
      name text PRIMARY KEY, sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  const files = (await readdir(join(root, "migrations")))
    .filter((name) => /^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
  for (const name of files) {
    const sql = await readFile(join(root, "migrations", name), "utf8");
    const sha256 = createHash("sha256").update(sql).digest("hex");
    const previous = await client.query(
      "SELECT sha256 FROM app_private.schema_migrations WHERE name = $1", [name],
    );
    if (previous.rows.length) {
      if (previous.rows[0].sha256 !== sha256) {
        throw new Error(`Migration ${name} mudou depois de aplicada.`);
      }
      console.log(`skip ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO app_private.schema_migrations(name, sha256) VALUES ($1, $2)",
      [name, sha256],
    );
    console.log(`applied ${name}`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
