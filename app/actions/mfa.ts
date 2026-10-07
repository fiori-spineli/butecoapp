"use server";

import { getNeonSession, openSession } from "@/lib/neon-session";
import { neonPool } from "@/lib/neon-db";
import { iniciarMfa, statusMfa, verificarMfa } from "@/lib/neon/mfa";
import { auditar } from "@/lib/auditoria";

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

/**
 * Privilege change rotates the session: the pre-MFA token stops working.
 * New row and old revocation commit together; if they were separate, a failure
 * in between left the pre-MFA token alive next to the elevated one.
 */
async function elevarSessao(userId: string, previousSessionId: string) {
  const client = await neonPool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ password_hash: string | null }>(
      "SELECT password_hash FROM public.users WHERE id = $1 FOR UPDATE", [userId],
    );
    if (!rows[0]?.password_hash) throw new Error("Conta sem senha local.");
    await client.query(
      "UPDATE app_private.sessions SET revoked_at = now() WHERE id = $1 AND user_id = $2",
      [previousSessionId, userId]);
    await openSession(userId, rows[0].password_hash,
      { mfaAt: Math.floor(Date.now() / 1000), client });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function validar(fatorId: string, codigo: string, enrollment: boolean) {
  const session = await admin();
  if (!session || fatorId !== session.userId) return { ok: false, mensagem: "Acesso negado." };
  try {
    const valid = await verificarMfa(session.userId, codigo.trim(), enrollment);
    await auditar(enrollment ? "mfa_inscricao" : "mfa_verificacao",
      { ator: session.userId, alvo: session.userId, ok: valid });
    if (!valid) return { ok: false, mensagem: "Código incorreto, expirado ou já usado." };
    await elevarSessao(session.userId, session.sessionId);
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
