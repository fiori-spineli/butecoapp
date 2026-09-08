"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { origemDoApp } from "@/lib/url";

export type EstadoForm = { ok: boolean; mensagem: string } | null;

/** Envia o link mágico por e-mail (fluxo sem senha). */
export async function enviarMagicLink(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { ok: false, mensagem: "Digite um e-mail válido." };
  }

  if (!supabaseConfigurado()) {
    return {
      ok: false,
      mensagem: "Supabase ainda não configurado — preencha o .env.local (veja o README).",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origemDoApp()}/auth/callback` },
  });

  if (error) {
    const excedeuCota =
      error.status === 429 || error.code === "over_email_send_rate_limit";

    return {
      ok: false,
      mensagem: excedeuCota
        ? "Limite de e-mails atingido. Aguarde alguns minutos antes de pedir outro link."
        : "Não consegui enviar o link agora. Tente novamente.",
    };
  }

  return {
    ok: true,
    mensagem: `Link enviado para ${email}. Abra o e-mail e toque no link para entrar.`,
  };
}

/** Login tradicional por e-mail e senha. */
export async function entrarComSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, mensagem: "Informe o e-mail e a senha." };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (
      error.message.includes("Invalid login credentials") ||
      error.code === "invalid_credentials"
    ) {
      return { ok: false, mensagem: "E-mail ou senha incorretos." };
    }
    return { ok: false, mensagem: "Não foi possível entrar. Tente novamente." };
  }

  redirect("/dashboard");
}

/** Cadastro de novo dono de bar com e-mail e senha. */
export async function cadastrarComSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!email || !email.includes("@")) {
    return { ok: false, mensagem: "Digite um e-mail válido." };
  }

  if (password.length < 6) {
    return { ok: false, mensagem: "A senha precisa ter pelo menos 6 caracteres." };
  }

  if (password !== confirmPassword) {
    return { ok: false, mensagem: "As senhas não coincidem." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await origemDoApp()}/auth/callback`,
    },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      return { ok: false, mensagem: "Este e-mail já está cadastrado. Tente entrar." };
    }
    return { ok: false, mensagem: error.message || "Não foi possível cadastrar." };
  }

  // Se o Supabase estiver com confirmação de e-mail ligada e não retornou sessão imediata
  if (data.user && !data.session) {
    return {
      ok: true,
      mensagem: `Cadastro realizado! Enviamos uma confirmação para ${email}. Confirme para entrar.`,
    };
  }

  // Se já gerou sessão direta (confirmations=false no config.toml)
  redirect("/onboarding");
}

/** Envio de redefinição de senha para o e-mail cadastrado. */
export async function redefinirSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { ok: false, mensagem: "Digite um e-mail válido." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origemDoApp()}/auth/callback?next=/onboarding`,
  });

  if (error) {
    return { ok: false, mensagem: "Não foi possível enviar o e-mail de redefinição." };
  }

  return {
    ok: true,
    mensagem: `Instruções enviadas para ${email}. Verifique sua caixa de entrada.`,
  };
}

export async function sair() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}