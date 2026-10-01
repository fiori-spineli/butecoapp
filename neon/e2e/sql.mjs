// psql -At equivalent for the e2e scripts when the target is a disposable Neon
// branch instead of the local Docker Postgres. Refuses the production host.
import pg from "pg";
const url = process.env.TEST_DATABASE_URL;
const production = process.env.NEON_PRODUCTION_HOST;
const host = url ? new URL(url).hostname : "";
if (!url || !production || host === production || host.includes("-pooler")) {
  console.error("TEST_DATABASE_URL (branch descartável, conexão direta) e NEON_PRODUCTION_HOST diferentes são obrigatórios.");
  process.exit(2);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const res = await client.query(process.argv[2]);
  const results = Array.isArray(res) ? res : [res];
  const last = results[results.length - 1];
  for (const row of last.rows ?? []) console.log(Object.values(row).map(v => v ?? "").join("|"));
} finally { await client.end(); }
