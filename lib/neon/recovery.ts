import "server-only";

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { neonPool } from "@/lib/neon-db";
import { enviarEmail } from "@/lib/email-resend";
import { COOKIE_AUTH, createSessionToken } from "@/lib/neon-session";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { problemaDaSenha } from "@/lib/senha";
import { origemDoApp } from "@/lib/url";

const COOKIE_RECOVERY = "buteco_recovery";
const EXPIRACAO_CODIGO_MINUTOS = 60;

function key() {
  const secret = process.env.SECRET_KEY;
  if (!secret || secret.length < 32) throw new Error("SECRET_KEY inválida.");
  return secret;
}

function digest(value: string): Buffer {
  return createHmac("sha256", key()).update(value).digest();
}

function hashCode(userId: string, code: string): Buffer {
  return digest(`recovery:code:v1:${userId}:${code}`);
}

type Proof = { sub: string; codeVersion: string; exp: number };

function signProof(payload: Proof): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${digest(`recovery:proof:v1:${body}`).toString("base64url")}`;
}

async function readProof(): Promise<Proof | null> {
  const token = (await cookies()).get(COOKIE_RECOVERY)?.value;
  if (!token || token.length > 1024) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return null;
  try {
    const received = Buffer.from(signature, "base64url");
    const expected = digest(`recovery:proof:v1:${body}`);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Proof;
    if (!/^[0-9a-f-]{36}$/i.test(payload.sub) || typeof payload.codeVersion !== "string" ||
        !Number.isSafeInteger(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export async function validRecoveryProof(): Promise<{ userId: string; email: string } | null> {
  const proof = await readProof();
  if (!proof) return null;
  const { rows } = await neonPool.query<{
    email: string; code_hash: Buffer; confirmed_at: string | null;
  }>(
    `SELECT u.email, r.code_hash, r.confirmed_at
       FROM app_private.password_recovery r
       JOIN public.users u ON u.id = r.user_id
      WHERE r.user_id = $1 AND r.expires_at > now()`, [proof.sub],
  );
  const row = rows[0];
  if (!row?.confirmed_at) return null;
  const version = createHash("sha256").update(row.code_hash).digest("base64url");
  return version === proof.codeVersion ? { userId: proof.sub, email: row.email } : null;
}

export async function requestRecovery(email: string, ipHash: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    throw new Error("Envio de e-mail não configurado.");
  }
  const count = async (scope: string) => {
    const { rows } = await neonPool.query<{ attempts: number }>(
      `INSERT INTO app_private.auth_rate_limits (key_hash, window_start, attempts)
       VALUES ($1, now(), 1)
       ON CONFLICT (key_hash) DO UPDATE SET
         attempts = CASE WHEN auth_rate_limits.window_start < now() - interval '1 hour'
           THEN 1 ELSE auth_rate_limits.attempts + 1 END,
         window_start = CASE WHEN auth_rate_limits.window_start < now() - interval '1 hour'
           THEN now() ELSE auth_rate_limits.window_start END
       RETURNING attempts`, [digest(`recovery:request:v2:${scope}`)],
    );
    return rows[0].attempts;
  };
  const emailAttempts = await count(`email:${email}`);
  const ipAttempts = await count(`ip:${ipHash}`);
  if (emailAttempts > 3 || ipAttempts > 10) return true;
  const { rows } = await neonPool.query<{ id: string; email: string }>(
    "SELECT id, email FROM public.users WHERE lower(email) = $1 AND suspended_at IS NULL LIMIT 1",
    [email],
  );
  const user = rows[0];
  if (!user) return true;
  const code = randomInt(0, 100_000_000).toString().padStart(8, "0");
  const codeHash = hashCode(user.id, code);
  await neonPool.query(
    `INSERT INTO app_private.password_recovery
     (user_id, code_hash, expires_at, attempts, confirmed_at, created_at)
     VALUES ($1, $2, now() + interval '1 hour', 0, NULL, now())
     ON CONFLICT (user_id) DO UPDATE SET
       code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at,
       attempts = 0, confirmed_at = NULL, created_at = now()`,
    [user.id, codeHash],
  );
  try {
    await enviarEmail(user.email, "Código de acesso do ButecoApp",
      `Seu código para criar uma nova senha é ${code}.\n\nEle vale por ${EXPIRACAO_CODIGO_MINUTOS} minutos. Se você não pediu isso, ignore esta mensagem.`);
  } catch (error) {
    console.error("[recovery] envio falhou", error);
    await neonPool.query(
      "DELETE FROM app_private.password_recovery WHERE user_id = $1 AND code_hash = $2",
      [user.id, codeHash],
    );
  }
  return true;
}

/** Admin-only caller: one-use invitation, consumed on a POST after the owner opens it. */
export async function createInviteLink(userId: string, email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await neonPool.query(
    `INSERT INTO app_private.password_recovery
     (user_id, code_hash, expires_at, attempts, confirmed_at, created_at)
     VALUES ($1, $2, now() + interval '24 hours', 0, NULL, now())
     ON CONFLICT (user_id) DO UPDATE SET
       code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at,
       attempts = 0, confirmed_at = NULL, created_at = now()`,
    [userId, hashCode(userId, token)],
  );
  const link = new URL("/auth/recuperar", await origemDoApp());
  link.searchParams.set("email", email);
  link.searchParams.set("convite", token);
  return link.toString();
}

export async function confirmRecovery(email: string, code: string): Promise<boolean> {
  if (!/^\d{8}$/.test(code) && !/^[0-9a-f]{64}$/.test(code)) return false;
  const client = await neonPool.connect();
  let userId: string | null = null;
  let codeVersion: string | null = null;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{
      user_id: string; code_hash: Buffer; attempts: number;
    }>(
      `SELECT r.user_id, r.code_hash, r.attempts
         FROM app_private.password_recovery r
         JOIN public.users u ON u.id = r.user_id
        WHERE lower(u.email) = $1 AND r.expires_at > now()
          AND r.confirmed_at IS NULL FOR UPDATE OF r`, [email],
    );
    const recovery = rows[0];
    if (!recovery || recovery.attempts >= 5) {
      await client.query("COMMIT");
      return false;
    }
    const expected = hashCode(recovery.user_id, code);
    if (!timingSafeEqual(expected, recovery.code_hash)) {
      await client.query(
        "UPDATE app_private.password_recovery SET attempts = attempts + 1 WHERE user_id = $1",
        [recovery.user_id],
      );
      await client.query("COMMIT");
      return false;
    }
    await client.query(
      "UPDATE app_private.password_recovery SET confirmed_at = now() WHERE user_id = $1",
      [recovery.user_id],
    );
    userId = recovery.user_id;
    codeVersion = createHash("sha256").update(recovery.code_hash).digest("base64url");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
  if (!userId || !codeVersion) return false;
  (await cookies()).set(COOKIE_RECOVERY,
    signProof({ sub: userId, codeVersion, exp: Math.floor(Date.now() / 1000) + 15 * 60 }), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 15 * 60,
    });
  return true;
}

export async function saveRecoveryPassword(password: string): Promise<boolean> {
  const proof = await validRecoveryProof();
  if (!proof) return false;
  if (problemaDaSenha(password, proof.email)) return false;
  const hash = await bcrypt.hash(password, 12);
  const client = await neonPool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ code_hash: Buffer; confirmed_at: string | null }>(
      `SELECT code_hash, confirmed_at FROM app_private.password_recovery
        WHERE user_id = $1 AND expires_at > now() FOR UPDATE`, [proof.userId],
    );
    if (!rows[0]?.confirmed_at ||
        createHash("sha256").update(rows[0].code_hash).digest("base64url") !==
          (await readProof())?.codeVersion) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE public.users SET password_hash = $1, email_verified_at = COALESCE(email_verified_at, now())
       WHERE id = $2`, [hash, proof.userId],
    );
    await client.query("DELETE FROM app_private.password_recovery WHERE user_id = $1", [proof.userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
  const store = await cookies();
  store.delete(COOKIE_RECOVERY);
  store.set(COOKIE_AUTH, createSessionToken(proof.userId, hash), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: store.get(COOKIE_LEMBRAR)?.value === "1" ? 30 * 24 * 60 * 60 : undefined,
  });
  return true;
}
