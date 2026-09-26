import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac,
  randomBytes, timingSafeEqual } from "node:crypto";
import type { PoolClient } from "pg";
import { neonPool } from "@/lib/neon-db";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PASSO_SEGUNDOS = 30;

function chave(): Buffer {
  const secret = process.env.SECRET_KEY;
  if (!secret || secret.length < 32) throw new Error("SECRET_KEY inválida para MFA.");
  return createHash("sha256").update("buteco:mfa:encryption:v1:").update(secret).digest();
}

function cifra(secret: Buffer): Buffer {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chave(), nonce);
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]);
}

function decifra(value: Buffer): Buffer {
  if (value.length < 29) throw new Error("Segredo MFA inválido.");
  const decipher = createDecipheriv("aes-256-gcm", chave(), value.subarray(0, 12));
  decipher.setAuthTag(value.subarray(12, 28));
  return Buffer.concat([decipher.update(value.subarray(28)), decipher.final()]);
}

function base32(input: Buffer): string {
  let buffer = 0; let bits = 0; let output = "";
  for (const byte of input) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALFABETO[(buffer >>> (bits -= 5)) & 31];
    }
  }
  if (bits) output += ALFABETO[(buffer << (5 - bits)) & 31];
  return output;
}

export function codigoTOTP(secret: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", secret).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000)
    .toString().padStart(6, "0");
}

function passoValido(secret: Buffer, code: string, lastUsed: number | null): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const now = Math.floor(Date.now() / 1000 / PASSO_SEGUNDOS);
  const received = Buffer.from(code);
  for (const step of [now - 1, now, now + 1]) {
    if (lastUsed !== null && step <= lastUsed) continue;
    if (timingSafeEqual(Buffer.from(codigoTOTP(secret, step)), received)) return step;
  }
  return null;
}

async function contarTentativa(client: PoolClient, userId: string): Promise<boolean> {
  const key = createHmac("sha256", chave()).update(`mfa:${userId}`).digest();
  const { rows } = await client.query<{ attempts: number }>(
    `INSERT INTO app_private.auth_rate_limits (key_hash, window_start, attempts)
     VALUES ($1, now(), 1)
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE WHEN auth_rate_limits.window_start < now() - interval '15 minutes'
         THEN 1 ELSE auth_rate_limits.attempts + 1 END,
       window_start = CASE WHEN auth_rate_limits.window_start < now() - interval '15 minutes'
         THEN now() ELSE auth_rate_limits.window_start END
     RETURNING attempts`, [key],
  );
  return rows[0].attempts <= 5;
}

export async function statusMfa(userId: string) {
  const { rows } = await neonPool.query<{ confirmed_at: string | null }>(
    "SELECT confirmed_at FROM app_private.mfa_factors WHERE user_id = $1", [userId],
  );
  return { active: !!rows[0]?.confirmed_at, enrolled: !!rows[0] };
}

export async function iniciarMfa(userId: string, email: string, setupKey: string) {
  const configured = process.env.ADMIN_MFA_ENROLLMENT_KEY;
  if (!configured || configured.length < 32) {
    throw new Error("A chave de ativação do MFA não está configurada.");
  }
  const client = await neonPool.connect();
  try {
    // Persist failed-key attempts independently of the enrollment transaction.
    if (!await contarTentativa(client, userId)) throw new Error("Muitas tentativas. Aguarde 15 minutos.");
    const submitted = createHash("sha256").update(setupKey).digest();
    const expected = createHash("sha256").update(configured).digest();
    if (!timingSafeEqual(submitted, expected)) throw new Error("Chave de ativação incorreta.");
    const secret = randomBytes(20);
    await client.query("BEGIN");
    const existing = await client.query<{ confirmed_at: string | null }>(
      "SELECT confirmed_at FROM app_private.mfa_factors WHERE user_id = $1 FOR UPDATE",
      [userId],
    );
    if (existing.rows[0]?.confirmed_at) throw new Error("MFA já está ativo.");
    await client.query(
      `INSERT INTO app_private.mfa_factors (user_id, secret_ciphertext)
       VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE
       SET secret_ciphertext = EXCLUDED.secret_ciphertext, last_used_step = NULL
       WHERE mfa_factors.confirmed_at IS NULL`, [userId, cifra(secret)],
    );
    await client.query("COMMIT");
    const encoded = base32(secret);
    const uri = `otpauth://totp/${encodeURIComponent(`ButecoApp Admin:${email}`)}` +
      `?secret=${encoded}&issuer=${encodeURIComponent("ButecoApp Admin")}&algorithm=SHA1&digits=6&period=30`;
    return { fatorId: userId, secret: encoded, uri };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function verificarMfa(userId: string, code: string, enrollment: boolean): Promise<boolean> {
  const client = await neonPool.connect();
  try {
    await client.query("BEGIN");
    const allowed = await contarTentativa(client, userId);
    const { rows } = await client.query<{
      secret_ciphertext: Buffer; confirmed_at: string | null; last_used_step: string | null;
    }>(
      `SELECT secret_ciphertext, confirmed_at, last_used_step
       FROM app_private.mfa_factors WHERE user_id = $1 FOR UPDATE`, [userId],
    );
    const factor = rows[0];
    if (!allowed || !factor || (!!factor.confirmed_at === enrollment)) {
      await client.query("COMMIT");
      return false;
    }
    const step = passoValido(decifra(factor.secret_ciphertext), code,
      factor.last_used_step === null ? null : Number(factor.last_used_step));
    if (step === null) {
      await client.query("COMMIT");
      return false;
    }
    await client.query(
      `UPDATE app_private.mfa_factors
       SET last_used_step = $1, confirmed_at = COALESCE(confirmed_at, now())
       WHERE user_id = $2`, [step, userId],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
