"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { origemDoApp } from "@/lib/url";
import { analisarEmail } from "@/lib/email-descartavel";
import { problemaDaSenha } from "@/lib/senha";
import { MENSAGEM_SENHA_VAZADA, senhaApareceEmVazamento } from "@/lib/senha-vazada";
import { normalizarCodigo } from "@/lib/recuperacao";
import { descartarProvaDeEmail, provaDeEmailValida, registrarProvaDeEmail } from "@/lib/prova-email";

export type EstadoForm = { ok: boolean; mensagem: string } | null;
export type EstadoRecuperacao = { ok: boolean; mensagem: string; enviadoEm?: number } | null;

const MENSAGEM_FORMATO = "Digite um e-mail válido.";
const MENSAGEM_MUITAS_TENTATIVAS = "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";

const COOKIE_AUTH = "buteco_session";
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

function captchaDoFormulario(formData: FormData): string | undefined {
  const token = String(formData.get("cf-turnstile-response") ?? "").trim();
  return token || undefined;
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

  try {
    const base = await origemDoApp();
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        captcha_token: captchaDoFormulario(formData),
      }),
      cache: "no-store",
    });

    const dados = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 429) return { ok: false, mensagem: MENSAGEM_MUITAS_TENTATIVAS };
      return {
        ok: false,
        mensagem:
          dados.detail ||
          "E-mail ou senha incorretos. Confira se o Caps Lock está desligado.",
      };
    }

    if (dados.token) {
      await gravarCookieSessao(dados.token, lembrar);
    }
  } catch (err) {
    console.error("[login] erro de conexao com o backend FastAPI:", err);
    return { ok: false, mensagem: "Não foi possível conectar ao servidor. Tente em instantes." };
  }

  redirect("/");
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

async function enviarCodigoDeRecuperacao(
  email: string,
  captchaToken: string | undefined,
): Promise<EstadoRecuperacao> {
  try {
    const base = await origemDoApp();
    const res = await fetch(`${base}/api/auth/recuperar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, captcha_token: captchaToken }),
      cache: "no-store",
    });

    if (!res.ok) {
      const dados = await res.json().catch(() => ({}));
      return { ok: false, mensagem: dados.detail || "Erro ao solicitar código de recuperação." };
    }

    return {
      ok: true,
      mensagem:
        "Se existe uma conta com esse e-mail, as instruções acabaram de sair. Digite o código aqui.",
      enviadoEm: Date.now(),
    };
  } catch {
    return { ok: false, mensagem: "Falha de conexão ao enviar e-mail. Tente novamente." };
  }
}

export async function pedirCodigoDeRecuperacao(
  _anterior: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));
  if (problema === "formato") return { ok: false, mensagem: MENSAGEM_FORMATO };
  return enviarCodigoDeRecuperacao(email, captchaDoFormulario(formData));
}

export async function pedirTrocaDeSenha(
  _anterior: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_AUTH)?.value;

  if (!token) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre de novo para trocar a senha." };
  }

  try {
    const base = await origemDoApp();
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, mensagem: "Sua sessão expirou. Entre de novo para trocar a senha." };
    }

    const usuario = await res.json();
    return enviarCodigoDeRecuperacao(usuario.email, captchaDoFormulario(formData));
  } catch {
    return { ok: false, mensagem: "Falha ao validar sessão. Tente novamente." };
  }
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
    const base = await origemDoApp();
    const res = await fetch(`${base}/api/auth/verificar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, codigo }),
      cache: "no-store",
    });

    const dados = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, mensagem: dados.detail || "Código incorreto ou vencido." };
    }

    if (dados.user_id) {
      await registrarProvaDeEmail(dados.user_id);
    }
  } catch {
    return { ok: false, mensagem: "Erro ao confirmar código. Tente novamente." };
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

  try {
    const base = await origemDoApp();
    const res = await fetch(`${base}/api/auth/validar-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token_hash: tokenHash }),
      cache: "no-store",
    });

    const dados = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, mensagem: dados.detail || "Este link já foi usado ou venceu." };
    }

    if (dados.user_id) {
      await registrarProvaDeEmail(dados.user_id);
    }
  } catch {
    return { ok: false, mensagem: "Falha ao validar link de recuperação." };
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
      const base = await origemDoApp();
      const res = await fetch(`${base}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const u = await res.json();
        userId = u.id;
        emailUsuario = u.email;
      }
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
    const base = await origemDoApp();
    const res = await fetch(`${base}/api/auth/alterar-senha`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ senha, user_id: userId }),
      cache: "no-store",
    });

    const dados = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { ok: false, mensagem: dados.detail || "Não foi possível salvar a nova senha." };
    }
  } catch {
    return { ok: false, mensagem: "Erro ao comunicar alteração de senha ao servidor." };
  }

  await descartarProvaDeEmail();
  return { ok: true, mensagem: "Senha salva. Entrando no seu bar…" };
}

export async function sair() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_AUTH);
  redirect("/login");
}