#!/usr/bin/env bash
# Local, disposable end-to-end run: Postgres in Docker + `next start` on :3100.
# Proves code behavior only. It is NOT evidence about the Neon branches or the
# Vercel preview (GUARDRAILS §2): the base schema here is the ORM model, not a
# dump of production. Never point it at a real DATABASE_URL.
set -euo pipefail
cd "$(dirname "$0")/../.."
WORK="${WORK:-$(mktemp -d)}"; mkdir -p "$WORK"
PORT=3100; C=buteco-pg-e2e
docker rm -f "$C" >/dev/null 2>&1 || true
docker run -d --name "$C" -e POSTGRES_PASSWORD=localtest -e POSTGRES_DB=buteco \
  -p 127.0.0.1:55432:5432 postgres:17-alpine >/dev/null
until docker exec "$C" pg_isready -U postgres -d buteco >/dev/null 2>&1; do sleep 1; done
docker exec -i "$C" psql -v ON_ERROR_STOP=1 -q -U postgres -d buteco < neon/e2e/local-base.sql

export DATABASE_URL="postgresql://postgres:localtest@127.0.0.1:55432/buteco" NEON_EXPECTED_HOST=127.0.0.1
node neon/migrate.mjs && node neon/migrate.mjs && node neon/verify.mjs
NEON_DISPOSABLE_HOST=127.0.0.1 NEON_PRODUCTION_HOST=not-this-host node neon/verify-admin.mjs
H=$(node -e "console.log(require('bcryptjs').hashSync('Senha-Teste-Local-1',10))")
docker exec -i "$C" psql -v ON_ERROR_STOP=1 -q -U postgres -d buteco -v h="$H" < neon/e2e/seed.sql

# Fresh random secrets per run; Cloudflare's public always-pass Turnstile test keys;
# a fake R2 (unreachable endpoint) so URL validation runs and uploads stop at the bucket.
eval "$(node -e "const c=require('crypto');for(const k of ['SECRET_KEY','IP_HASH_SALT','ADMIN_MFA_ENROLLMENT_KEY'])console.log('export '+k+'='+c.randomBytes(32).toString('base64url'))")"
export NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
export NEXT_PUBLIC_SITE_URL="http://localhost:$PORT" R2_ENDPOINT_URL=https://127.0.0.1:9 R2_ACCESS_KEY_ID=fake \
  R2_SECRET_ACCESS_KEY=fake R2_BUCKET_NAME=fake R2_PUBLIC_DOMAIN=https://img.example.test
npm run build > "$WORK/build.log" 2>&1
npx next start -p "$PORT" > "$WORK/server.log" 2>&1 & SERVER=$!
trap 'kill $SERVER 2>/dev/null || true; docker rm -f "$C" >/dev/null 2>&1 || true' EXIT
until curl -s -o /dev/null "http://localhost:$PORT/login"; do sleep 1; done

node -e "const s=require('sharp');const w=process.argv[1];Promise.all([
  s({create:{width:64,height:64,channels:3,background:'#c80'}}).png().toFile(w+'/ok.png'),
  s({create:{width:5000,height:5000,channels:3,background:'#000'}}).png({compressionLevel:9}).toFile(w+'/bomba.png')])" "$WORK"
: > "$WORK/vazio.png"; echo "nao sou imagem" > "$WORK/falso.png"
node neon/e2e/sessao-mfa-isolamento.mjs
OUT="$WORK/ca.txt" node neon/e2e/login.mjs "http://localhost:$PORT" dono-b@example.test Senha-Teste-Local-1 >/dev/null
node neon/e2e/dinheiro.mjs "$WORK"
node neon/e2e/upload.mjs "$WORK"
