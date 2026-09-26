"use server";

import { cookies } from "next/headers";
import { COOKIE_AUTH, createSessionToken, getNeonSession } from "@/lib/neon-session";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { neonPool } from "@/lib/neon-db";
import { iniciarMfa, statusMfa, verificarMfa } from "@/lib/neon/mfa";

export interface StatusMFA {
  temFatorAtivo: boolean;
  precisaVerificar: boolean;
  fatorId?: string;
}

async function admin() {
  const session = await getNeonSession();
  return session?.isAdmin ? session : null;
}

export async function verificarStatusMFA(): Promise<StatusMFA> {
  const session = await admin();
  if (!session) return { temFatorAtivo: false, precisaVerificar: true };
  const state = await statusMfa(session.userId);
  return {
    temFatorAtivo: state.active,
    precisaVerificar: !session.mfaVerified,
    fatorId: state.active ? session.userId : undefined,
  };
}

export async function iniciarCadastroTOTP(setupKey: string) {
  const session = await admin();
  if (!session) return { ok: false, mensagem: "Acesso negado." };
  try {
    const data = await iniciarMfa(session.userId, session.email, setupKey);
    return { ok: true, ...data, qrCode: data.uri };
  } catch (error) {
    return { ok: false, mensagem: error instanceof Error ? error.message : "Não foi possível iniciar o MFA." };
  }
}

async function elevarSessao(userId: string) {
  const { rows } = await neonPool.query<{ password_hash: string | null }>(
    "SELECT password_hash FROM public.users WHERE id = $1", [userId],
  );
  if (!rows[0]?.password_hash) throw new Error("Conta sem senha local.");
  const store = await cookies();
  store.set(COOKIE_AUTH, createSessionToken(userId, rows[0].password_hash,
    Math.floor(Date.now() / 1000)), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: store.get(COOKIE_LEMBRAR)?.value === "1" ? 30 * 24 * 60 * 60 : undefined,
  });
}

async function validar(fatorId: string, codigo: string, enrollment: boolean) {
  const session = await admin();
  if (!session || fatorId !== session.userId) return { ok: false, mensagem: "Acesso negado." };
  try {
    const valid = await verificarMfa(session.userId, codigo.trim(), enrollment);
    if (!valid) return { ok: false, mensagem: "Código incorreto, expirado ou já usado." };
    await elevarSessao(session.userId);
    return { ok: true };
  } catch (error) {
    console.error("[mfa] falha de verificação", error);
    return { ok: false, mensagem: "Não foi possível validar o segundo fator." };
  }
}

export async function confirmarCadastroTOTP(fatorId: string, codigo: string) {
  return validar(fatorId, codigo, true);
}

export async function validarCodigoMFA(fatorId: string, codigo: string) {
  return validar(fatorId, codigo, false);
}
