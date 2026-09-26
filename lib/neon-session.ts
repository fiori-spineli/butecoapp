import "server-only";

import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { neonPool } from "@/lib/neon-db";

export const COOKIE_AUTH = "buteco_session";
const SESSION_SECONDS = 30 * 24 * 60 * 60;

type SessionPayload = { sub: string; exp: number; passwordVersion: string; mfaAt?: number };
export type NeonSession = { userId: string; email: string; isAdmin: boolean; mfaVerified: boolean };

function sessionKey(): string {
  const key = process.env.SECRET_KEY;
  if (!key || key.length < 32) throw new Error("SECRET_KEY precisa ter pelo menos 32 caracteres");
  return key;
}

function signature(value: string): Buffer {
  return createHmac("sha256", sessionKey()).update(`buteco:session:v1:${value}`).digest();
}

function passwordVersion(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url");
}

export function createSessionToken(userId: string, passwordHash: string, mfaAt?: number): string {
  const payload: SessionPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    passwordVersion: passwordVersion(passwordHash),
    ...(mfaAt ? { mfaAt } : {}),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${signature(body).toString("base64url")}`;
}

export async function getNeonSession(): Promise<NeonSession | null> {
  const token = (await cookies()).get(COOKIE_AUTH)?.value;
  if (!token || token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  try {
    const received = Buffer.from(parts[1], "base64url");
    const expected = signature(parts[0]);
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as SessionPayload;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.passwordVersion !== "string" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) return null;

    const result = await neonPool.query<{
      id: string; email: string; password_hash: string; is_admin: boolean;
      mfa_confirmed_at: string | null; suspended_at: string | null;
    }>(
      `SELECT u.id, u.email, u.password_hash, u.suspended_at,
              EXISTS (SELECT 1 FROM public.administradores a WHERE a.user_id = u.id) AS is_admin,
              (SELECT confirmed_at FROM app_private.mfa_factors f
                WHERE f.user_id = u.id) AS mfa_confirmed_at
         FROM public.users u WHERE u.id = $1 LIMIT 1`,
      [payload.sub],
    );
    const user = result.rows[0];
    if (!user?.password_hash || user.suspended_at ||
        payload.passwordVersion !== passwordVersion(user.password_hash)) return null;
    const now = Math.floor(Date.now() / 1000);
    const mfaVerified = user.is_admin && !!user.mfa_confirmed_at &&
      Number.isSafeInteger(payload.mfaAt) && !!payload.mfaAt &&
      payload.mfaAt <= now && now - payload.mfaAt < 12 * 60 * 60 &&
      payload.mfaAt >= Math.floor(Date.parse(user.mfa_confirmed_at) / 1000);
    return { userId: user.id, email: user.email, isAdmin: user.is_admin,
      mfaVerified: Boolean(mfaVerified) };
  } catch (error) {
    console.error("[session] validação falhou", error);
    return null;
  }
}
