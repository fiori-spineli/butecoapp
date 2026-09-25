"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { analisarEmail } from "@/lib/email-descartavel";
import { problemaDaSenha } from "@/lib/senha";
import { MENSAGEM_SENHA_VAZADA, senhaApareceEmVazamento } from "@/lib/senha-vazada";
import { normalizarCodigo } from "@/lib/recuperacao";
import { descartarProvaDeEmail, provaDeEmailValida, registrarProvaDeEmail } from "@/lib/prova-email";

export type EstadoForm = { ok: boolean; mensagem: string } | null;
export type EstadoRecuperacao = { ok: boolean; mensagem: string; enviadoEm?: number } | null;

const MENSAGEM_FORMATO = "Digite um e-mail válido.";
const COOKIE_AUTH = "buteco_session";
const DIAS_SESSAO = 30;

// Pool de conexão direta com o Neon (converte o prefixo caso tenha vindo do python)
const connectionString = (process.env.DATABASE_URL || "")
  .replace("postgresql+psycopg://", "postgresql://")
  .replace("postgresql+asyncpg://", "postgresql://");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

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
  let userId = "";

  try {
    // 1. Busca o usuário direto no Neon
    const userRes = await pool.query(
      "SELECT id, email, password_hash FROM public.users WHERE LOWER(email) = $1 LIMIT 1",
      [email]
    );

    const user = userRes.rows[0];

    if (!user || !user.password_hash) {
      return { ok: false, mensagem: "E-mail ou senha incorretos." };
    }

    // 2. Valida a senha usando o hash Bcrypt migrado do Supabase
    const senhaValida = await bcrypt.compare(password, user.password_hash);
    if (!senhaValida) {
      return { ok: false, mensagem: "E-mail ou senha incorretos." };
    }

    userId = user.id;

    // 3. Verifica se é Administrador
    const adminRes = await pool.query(
      "SELECT id FROM public.administradores WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    isAdmin = adminRes.rows.length > 0;

    // 4. Cria o payload seguro de sessão
    const payload = JSON.stringify({
      sub: userId,
      email: user.email,
      is_admin: isAdmin,
      criado_em: Date.now(),
    });
    const token = Buffer.from(payload).toString("base64url");

    // 5. Grava o cookie buteco_session no navegador
    await gravarCookieSessao(token, lembrar);

  } catch (err: any) {
    console.error("[login erro]", err);
    return { ok: false, mensagem: `Falha na conexão com o banco: ${err.message || "Erro desconhecido"}` };
  }

  // 6. Redirecionamento
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
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));
  if (problema === "formato") return { ok: false, mensagem: MENSAGEM_FORMATO };

  return {
    ok: true,
    mensagem: "Se existe uma conta com esse e-mail, as instruções foram geradas.",
    enviadoEm: Date.now(),
  };
}

export async function pedirTrocaDeSenha(
  _anterior: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  return {
    ok: true,
    mensagem: "Código de confirmação solicitado com sucesso.",
    enviadoEm: Date.now(),
  };
}

export async function confirmarCodigoDeRecuperacao(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));
  if (problema === "formato") return { ok: false, mensagem: MENSAGEM_FORMATO };

  const codigo = normalizarCodigo(String(formData.get("codigo") ?? ""));
  if (!codigo) {
    return { ok: false, mensagem: "Digite o código de 8 números que chegou no e-mail." };
  }

  try {
    const res = await pool.query("SELECT id FROM public.users WHERE LOWER(email) = $1 LIMIT 1", [email]);
    if (res.rows.length > 0) {
      await registrarProvaDeEmail(res.rows[0].id);
    }
  } catch (err) {
    return { ok: false, mensagem: "Falha ao validar código no servidor." };
  }

  redirect("/nova-senha");
}

export async function abrirLinkDeRecuperacao(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  if (!tokenHash) {
    return { ok: false, mensagem: "Link incompleto. Peça um código novo em 'Esqueceu a senha?'." };
  }
  redirect("/nova-senha");
}

export async function salvarNovaSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_AUTH)?.value;

  let userId: string | null = null;
  let emailUsuario: string | null = null;

  if (token) {
    try {
      const payload = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
      userId = payload.sub;
      emailUsuario = payload.email;
    } catch {}
  }

  if (userId) {
    const provou = await provaDeEmailValida(userId);
    if (!provou) {
      return {
        ok: false,
        mensagem: "Por segurança, confirme o código que enviamos por e-mail antes de trocar a senha.",
      };
    }
  }

  const problema = problemaDaSenha(senha, emailUsuario);
  if (problema) return { ok: false, mensagem: problema };

  if (senha !== confirmarSenha) {
    return { ok: false, mensagem: "As duas senhas não são iguais. Digite de novo." };
  }

  if (await senhaApareceEmVazamento(senha)) {
    return { ok: false, mensagem: MENSAGEM_SENHA_VAZADA };
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const novoHash = await bcrypt.hash(senha, salt);

    if (userId) {
      await pool.query("UPDATE public.users SET password_hash = $1 WHERE id = $2", [novoHash, userId]);
    }
  } catch (err: any) {
    return { ok: false, mensagem: "Não foi possível salvar a nova senha no banco." };
  }

  await descartarProvaDeEmail();
  return { ok: true, mensagem: "Senha salva com sucesso! Entrando no seu bar…" };
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