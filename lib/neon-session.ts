import "server-only";

import { createHmac, createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import { neonPool } from "@/lib/neon-db";
import { COOKIE_LEMBRAR } from "@/lib/sessao";

export const COOKIE_AUTH = "buteco_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;
/** Same window the Supabase-era panel used (lib/mfa-frescor.ts): one working day. */
const MFA_SECONDS = 12 * 60 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type SessionPayload = {
  sub: string; sid: string; exp: number; passwordVersion: string; mfaAt?: number;
};
export type NeonSession = {
  userId: string; sessionId: string; email: string; isAdmin: boolean; mfaVerified: boolean;
};

function sessionKey(): string {
  const key = process.env.SECRET_KEY;
  if (!key || key.length < 32) throw new Error("SECRET_KEY precisa ter pelo menos 32 caracteres");
  return key;
}

function signature(value: string): Buffer {
  return createHmac("sha256", sessionKey()).update(`buteco:session:v2:${value}`).digest();
}

function passwordVersion(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url");
}

/**
 * Signature and shape only. A token that passes here is NOT a session yet:
 * the database row decides whether it is still alive (getNeonSession).
 */
function readToken(token: string | undefined): SessionPayload | null {
  if (!token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const received = Buffer.from(parts[1], "base64url");
    const expected = signature(parts[0]);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as SessionPayload;
    if (
      typeof payload.sub !== "string" || !UUID.test(payload.sub) ||
      typeof payload.sid !== "string" || !UUID.test(payload.sid) ||
      typeof payload.passwordVersion !== "string" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000) ||
      (payload.mfaAt !== undefined && !Number.isSafeInteger(payload.mfaAt))
    ) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Registers a session row and writes its cookie. Pass `client` when the
 * caller is inside a transaction that must also cover the new session.
 */
export async function openSession(userId: string, passwordHash: string,
  options: { mfaAt?: number; client?: PoolClient; lembrar?: boolean } = {}): Promise<void> {
  const db = options.client ?? neonPool;
  const sid = randomUUID();
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  // Retention: a revoked or expired row is useless after a week of audit trail.
  await db.query(
    `DELETE FROM app_private.sessions
      WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days'`);
  await db.query(
    `INSERT INTO app_private.sessions (id, user_id, expires_at)
     VALUES ($1, $2, to_timestamp($3))`, [sid, userId, exp]);
  const payload: SessionPayload = {
    sub: userId, sid, exp, passwordVersion: passwordVersion(passwordHash),
    ...(options.mfaAt ? { mfaAt: options.mfaAt } : {}),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const store = await cookies();
  // Login passes the checkbox explicitly; later rotations keep the stored preference.
  const lembrar = options.lembrar ?? store.get(COOKIE_LEMBRAR)?.value === "1";
  store.set(COOKIE_AUTH, `${body}.${signature(body).toString("base64url")}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: lembrar ? SESSION_SECONDS : undefined,
  });
}

/** Revokes the session in this browser on the server, then drops the cookie. */
export async function closeCurrentSession(): Promise<void> {
  const store = await cookies();
  const payload = readToken(store.get(COOKIE_AUTH)?.value);
  if (payload) {
    await neonPool.query(
      `UPDATE app_private.sessions SET revoked_at = now()
        WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, [payload.sid, payload.sub]);
  }
  store.set(COOKIE_AUTH, "", { path: "/", maxAge: 0, expires: new Date(0) });
}

/** Password change, suspension: every device of this user loses access. */
export async function revokeUserSessions(db: PoolClient | typeof neonPool,
  userId: string): Promise<void> {
  await db.query(
    `UPDATE app_private.sessions SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`, [userId]);
}

export async function getNeonSession(): Promise<NeonSession | null> {
  const payload = readToken((await cookies()).get(COOKIE_AUTH)?.value);
  if (!payload) return null;

  try {
    const result = await neonPool.query<{
      id: string; email: string; password_hash: string; is_admin: boolean;
      mfa_confirmed_at: string | null; suspended_at: string | null;
    }>(
      `SELECT u.id, u.email, u.password_hash, u.suspended_at,
              EXISTS (SELECT 1 FROM public.administradores a WHERE a.user_id = u.id) AS is_admin,
              (SELECT confirmed_at FROM app_private.mfa_factors f
                WHERE f.user_id = u.id) AS mfa_confirmed_at
         FROM public.users u
         JOIN app_private.sessions s ON s.user_id = u.id
        WHERE u.id = $1 AND s.id = $2 AND s.revoked_at IS NULL AND s.expires_at > now()
        LIMIT 1`,
      [payload.sub, payload.sid],
    );
    const user = result.rows[0];
    if (!user?.password_hash || user.suspended_at ||
        payload.passwordVersion !== passwordVersion(user.password_hash)) return null;
    const now = Math.floor(Date.now() / 1000);
    const mfaAt = payload.mfaAt;
    const mfaVerified = user.is_admin && !!user.mfa_confirmed_at &&
      mfaAt !== undefined && mfaAt <= now && now - mfaAt < MFA_SECONDS &&
      mfaAt >= Math.floor(Date.parse(user.mfa_confirmed_at) / 1000);
    return { userId: user.id, sessionId: payload.sid, email: user.email,
      isAdmin: user.is_admin, mfaVerified: Boolean(mfaVerified) };
  } catch (error) {
    console.error("[session] validação falhou", error);
    return null;
  }
}
