"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { analisarEmail } from "@/lib/email-descartavel";
import { neonPool } from "@/lib/neon-db";
import { COOKIE_AUTH, createSessionToken } from "@/lib/neon-session";

export type EstadoForm = { ok: boolean; mensagem: string } | null;
export type EstadoRecuperacao = { ok: boolean; mensagem: string; enviadoEm?: number } | null;

const MENSAGEM_FORMATO = "Digite um e-mail válido.";
const DIAS_SESSAO = 30;

async function registrarPreferenciaDeSessao(lembrar: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_LEMBRAR, lembrar ? "1" : "0", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}

async function gravarCookieSessao(token: string, lembrar: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_AUTH, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: lembrar ? 60 * 60 * 24 * DIAS_SESSAO : undefined,
  });
}

export async function entrarComSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const lembrar = String(formData.get("lembrar") ?? "") === "on";

  if (!email || !password) {
    return { ok: false, mensagem: "Informe o e-mail e a senha." };
  }

  await registrarPreferenciaDeSessao(lembrar);

  let isAdmin = false;
  try {
    // Busca o usuário diretamente no Neon.
    const userRes = await neonPool.query(
      "SELECT id, email, password_hash FROM public.users WHERE LOWER(email) = $1 LIMIT 1",
      [email]
    );

    const user = userRes.rows[0];

    if (!user || !user.password_hash) {
      return { ok: false, mensagem: "E-mail ou senha incorretos." };
    }

    // Valida a senha usando o hash Bcrypt migrado do Supabase.
    const senhaValida = await bcrypt.compare(password, user.password_hash);
    if (!senhaValida) {
      return { ok: false, mensagem: "E-mail ou senha incorretos." };
    }

    // O cargo é consultado no banco, sem confiar em dados enviados pelo cliente.
    const adminRes = await neonPool.query(
      "SELECT id FROM public.administradores WHERE user_id = $1 LIMIT 1",
      [user.id]
    );
    isAdmin = adminRes.rows.length > 0;

    // Assinatura e vínculo ao hash invalidam cookies forjados e sessões antigas
    // depois de uma troca de senha. O cargo é consultado novamente em cada acesso.
    const token = createSessionToken(user.id, user.password_hash);

    // Grava o cookie buteco_session no navegador.
    await gravarCookieSessao(token, lembrar);

  } catch (error) {
    console.error("[login erro]", error);
    return { ok: false, mensagem: "Não foi possível entrar agora. Tente novamente mais tarde." };
  }

  // Redireciona após sair do bloco try/catch, como exige o Next.js.
  if (isAdmin) {
    redirect("/admin");
  } else {
    redirect("/");
  }
}

export async function entrarComGoogle(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await registrarPreferenciaDeSessao(String(formData.get("lembrar") ?? "") === "on");
  return {
    ok: false,
    mensagem: "O login com Google está em transição para o novo servidor. Use e-mail e senha.",
  };
}

export async function pedirCodigoDeRecuperacao(
  _anterior: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  const { problema } = analisarEmail(String(formData.get("email") ?? ""));
  if (problema === "formato") return { ok: false, mensagem: MENSAGEM_FORMATO };

  return { ok: false, mensagem: "A recuperação de senha está temporariamente indisponível. Contate o suporte." };
}

export async function pedirTrocaDeSenha(): Promise<EstadoRecuperacao> {
  return { ok: false, mensagem: "A troca de senha está temporariamente indisponível. Contate o suporte." };
}

export async function confirmarCodigoDeRecuperacao(): Promise<EstadoForm> {
  return { ok: false, mensagem: "Não é possível validar códigos de recuperação no momento." };
}

export async function abrirLinkDeRecuperacao(): Promise<EstadoForm> {
  return { ok: false, mensagem: "Links de recuperação antigos não são aceitos. Contate o suporte." };
}

export async function salvarNovaSenha(): Promise<EstadoForm> {
  return { ok: false, mensagem: "A redefinição de senha está temporariamente indisponível. Contate o suporte." };
}

export async function sair() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_AUTH, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  redirect("/login");
}
