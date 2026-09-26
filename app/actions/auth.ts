"use server";

import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { analisarEmail } from "@/lib/email-descartavel";
import { neonPool } from "@/lib/neon-db";
import { COOKIE_AUTH, createSessionToken, getNeonSession } from "@/lib/neon-session";
import { confirmRecovery, requestRecovery, saveRecoveryPassword } from "@/lib/neon/recovery";
import { conferirTurnstile } from "@/lib/turnstile";
import { hashDoIpAtual, ipDoVisitante } from "@/lib/ip";
import { problemaDaSenha } from "@/lib/senha";

export type EstadoForm = { ok: boolean; mensagem: string } | null;
export type EstadoRecuperacao = { ok: boolean; mensagem: string; enviadoEm?: number } | null;

const DUMMY_HASH = "$2b$12$J9LaU5g8DCENksnu.Dun2ehOi8RJKs7CMuQZy4J9JOl0ccDhnfdka";

function loginRateKey(email: string, ip: string): Buffer {
  const secret = process.env.SECRET_KEY;
  if (!secret || secret.length < 32) throw new Error("SECRET_KEY inválida.");
  return createHmac("sha256", secret).update(`login:${email}:${ip}`).digest();
}

async function gravarSessao(userId: string, hash: string, lembrar: boolean) {
  const store = await cookies();
  store.set(COOKIE_LEMBRAR, lembrar ? "1" : "0", {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 400 * 24 * 60 * 60,
  });
  store.set(COOKIE_AUTH, createSessionToken(userId, hash), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: lembrar ? 30 * 24 * 60 * 60 : undefined,
  });
}

export async function entrarComSenha(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const lembrar = String(formData.get("lembrar") ?? "") === "on";
  if (!email || !password) return { ok: false, mensagem: "Informe o e-mail e a senha." };
  if (!await conferirTurnstile(String(formData.get("cf-turnstile-response") ?? ""),
    await ipDoVisitante())) {
    return { ok: false, mensagem: "A verificação de segurança falhou. Tente novamente." };
  }
  let destination = "/dashboard";
  try {
    const key = loginRateKey(email, (await hashDoIpAtual()) || "sem-ip");
    const { rows: rate } = await neonPool.query<{ attempts: number }>(
      `INSERT INTO app_private.auth_rate_limits (key_hash, window_start, attempts)
       VALUES ($1, now(), 1)
       ON CONFLICT (key_hash) DO UPDATE SET
         attempts = CASE WHEN auth_rate_limits.window_start < now() - interval '15 minutes'
           THEN 1 ELSE auth_rate_limits.attempts + 1 END,
         window_start = CASE WHEN auth_rate_limits.window_start < now() - interval '15 minutes'
           THEN now() ELSE auth_rate_limits.window_start END
       RETURNING attempts`, [key],
    );
    if (rate[0].attempts > 10) {
      return { ok: false, mensagem: "Muitas tentativas. Aguarde 15 minutos." };
    }
    const { rows } = await neonPool.query<{
      id: string; password_hash: string | null; suspended_at: string | null;
    }>(
      "SELECT id, password_hash, suspended_at FROM public.users WHERE lower(email) = $1 LIMIT 1",
      [email],
    );
    const user = rows[0];
    const valid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
    if (!user || !valid || user.suspended_at || !user.password_hash) {
      return { ok: false, mensagem: "E-mail ou senha incorretos." };
    }
    await neonPool.query("DELETE FROM app_private.auth_rate_limits WHERE key_hash = $1", [key]);
    await neonPool.query("UPDATE public.users SET last_login_at = now() WHERE id = $1", [user.id]);
    const { rows: access } = await neonPool.query<{ is_admin: boolean; has_bar: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM public.administradores WHERE user_id = $1) AS is_admin,
              EXISTS(SELECT 1 FROM public.bars WHERE owner_id = $1) AS has_bar`, [user.id],
    );
    destination = access[0].is_admin ? "/admin" : access[0].has_bar ? "/dashboard" : "/onboarding";
    await gravarSessao(user.id, user.password_hash, lembrar);
  } catch (error) {
    console.error("[login] falha", error);
    return { ok: false, mensagem: "Não foi possível entrar agora." };
  }
  redirect(destination);
}

export async function entrarComGoogle(): Promise<EstadoForm> {
  return { ok: false, mensagem: "Use e-mail e senha para entrar." };
}

export async function pedirCodigoDeRecuperacao(_anterior: EstadoRecuperacao,
  formData: FormData): Promise<EstadoRecuperacao> {
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));
  if (problema) return { ok: false, mensagem: "Digite um e-mail válido." };
  const ip = await ipDoVisitante();
  if (!await conferirTurnstile(String(formData.get("cf-turnstile-response") ?? ""), ip)) {
    return { ok: false, mensagem: "A verificação de segurança falhou. Tente de novo." };
  }
  try {
    await requestRecovery(email, (await hashDoIpAtual()) || "sem-ip");
  } catch (error) {
    console.error("[recovery] falha ao pedir código", error);
    return { ok: false, mensagem: "Não foi possível enviar o código agora." };
  }
  return { ok: true, mensagem: "Se esta conta existir, o código foi enviado.", enviadoEm: Date.now() };
}

export async function pedirTrocaDeSenha(previous: EstadoRecuperacao,
  formData: FormData): Promise<EstadoRecuperacao> {
  const session = await getNeonSession();
  if (!session) return { ok: false, mensagem: "Entre na sua conta." };
  formData.set("email", session.email);
  return pedirCodigoDeRecuperacao(previous, formData);
}

export async function confirmarCodigoDeRecuperacao(_anterior: EstadoForm,
  formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("codigo") ?? "").trim();
  try {
    if (!await confirmRecovery(email, code)) {
      return { ok: false, mensagem: "Código inválido, expirado ou já usado." };
    }
  } catch (error) {
    console.error("[recovery] falha ao confirmar código", error);
    return { ok: false, mensagem: "Não foi possível confirmar o código agora." };
  }
  redirect("/nova-senha");
}

export async function abrirLinkDeRecuperacao(): Promise<EstadoForm> {
  return { ok: false, mensagem: "Peça um código novo na tela de login." };
}

export async function salvarNovaSenha(_anterior: EstadoForm,
  formData: FormData): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmarSenha") ?? "");
  if (senha !== confirmacao) return { ok: false, mensagem: "As senhas não conferem." };
  const problema = problemaDaSenha(senha, String(formData.get("email") ?? ""));
  if (problema) return { ok: false, mensagem: problema };
  try {
    if (!await saveRecoveryPassword(senha)) {
      return { ok: false, mensagem: "A confirmação expirou. Peça outro código." };
    }
  } catch (error) {
    console.error("[recovery] falha ao salvar senha", error);
    return { ok: false, mensagem: "Não foi possível salvar a senha agora." };
  }
  return { ok: true, mensagem: "Senha criada com sucesso." };
}

export async function sair() {
  const store = await cookies();
  store.set(COOKIE_AUTH, "", { path: "/", maxAge: 0, expires: new Date(0) });
  redirect("/login");
}
