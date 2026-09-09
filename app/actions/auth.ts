"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { origemDoApp } from "@/lib/url";
import { MENSAGEM_DESCARTAVEL, analisarEmail } from "@/lib/email-descartavel";

export type EstadoForm = { ok: boolean; mensagem: string } | null;

const MENSAGEM_FORMATO = "Digite um e-mail válido.";

/**
 * Quantas contas podem nascer da mesma conexão.
 *
 * Não é 1 de propósito: operadora de celular põe milhares de aparelhos atrás
 * do mesmo IP (NAT), e prédio ou praça de alimentação com Wi-Fi compartilhado
 * faz o mesmo. Com 1, dois donos de bar na mesma rede se atrapalhariam. Três
 * ainda barra criação em massa e não pune vizinho.
 */
const CADASTROS_POR_IP = 3;

/**
 * SHA-256 do IP de quem está pedindo o cadastro.
 *
 * Guardamos o hash, nunca o endereço — ver o comentário da migration 0007. O
 * sal vem do ambiente; sem ele o hash continua funcionando para comparar, mas
 * fica reversível por força bruta, já que o espaço de IPv4 é pequeno. Defina
 * IP_HASH_SALT na Vercel para fechar isso.
 */
async function hashDoIpAtual(): Promise<string | null> {
  const cabecalhos = await headers();
  const bruto =
    cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    cabecalhos.get("x-real-ip")?.trim() ??
    "";

  if (!bruto) return null;

  const sal = process.env.IP_HASH_SALT ?? "buteco-sal-padrao";
  return createHash("sha256").update(`${sal}:${bruto}`).digest("hex");
}

/**
 * Grava a preferência de "manter conectado".
 *
 * É esse cookie que o setAll do cliente Supabase lê para decidir a validade
 * dos cookies de sessão — ver lib/sessao.ts. Precisa ser escrito ANTES de
 * criar o cliente, senão a decisão sai com o valor antigo.
 */
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

/**
 * Envia o link mágico. É só entrada, não cria conta: quem ainda não tem
 * cadastro passa pela aba de cadastro, que é onde ficam as travas de e-mail
 * descartável, limite por IP e confirmação. Uma porta só para criar conta é
 * uma porta só para auditar.
 */
export async function enviarMagicLink(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));

  if (problema === "formato") return { ok: false, mensagem: MENSAGEM_FORMATO };
  if (problema === "descartavel") return { ok: false, mensagem: MENSAGEM_DESCARTAVEL };

  if (!supabaseConfigurado()) {
    return {
      ok: false,
      mensagem: "Supabase ainda não configurado — preencha o .env.local (veja o README).",
    };
  }

  await registrarPreferenciaDeSessao(String(formData.get("lembrar") ?? "") === "on");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${await origemDoApp()}/auth/callback`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    const excedeuCota =
      error.status === 429 || error.code === "over_email_send_rate_limit";

    // O Supabase recusa com "Signups not allowed for otp" quando o e-mail não
    // tem cadastro e shouldCreateUser está desligado.
    const naoCadastrado =
      error.code === "otp_disabled" || /signups? not allowed/i.test(error.message);

    if (naoCadastrado) {
      return {
        ok: false,
        mensagem: "Não encontrei conta com esse e-mail. Use a aba de cadastro para criar a sua.",
      };
    }

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
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, mensagem: "Informe o e-mail e a senha." };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  await registrarPreferenciaDeSessao(String(formData.get("lembrar") ?? "") === "on");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
      return {
        ok: false,
        mensagem:
          "Sua conta ainda não foi confirmada. Abra o e-mail que enviamos e toque no link de confirmação.",
      };
    }
    if (
      error.message.includes("Invalid login credentials") ||
      error.code === "invalid_credentials"
    ) {
      return { ok: false, mensagem: "E-mail ou senha incorretos." };
    }
    return { ok: false, mensagem: "Não foi possível entrar. Tente novamente." };
  }

  redirect("/");
}

/**
 * Cadastro do dono do bar.
 *
 * Três travas, nesta ordem: formato, e-mail descartável e um cadastro por IP.
 * A conta só passa a existir de verdade quando a pessoa abre o link de
 * confirmação na própria caixa — com `Confirm email` ligado no Supabase, o
 * signUp não devolve sessão.
 */
export async function cadastrarComSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (problema === "formato") return { ok: false, mensagem: MENSAGEM_FORMATO };
  if (problema === "descartavel") return { ok: false, mensagem: MENSAGEM_DESCARTAVEL };

  if (password.length < 8) {
    return { ok: false, mensagem: "A senha precisa ter pelo menos 8 caracteres." };
  }

  if (password !== confirmPassword) {
    return { ok: false, mensagem: "As senhas não coincidem." };
  }

  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  const supabase = await createSupabaseServerClient();
  const ipHash = await hashDoIpAtual();

  // Consulta antes de criar: um cadastro que falha por outro motivo (e-mail já
  // existe, senha curta) não pode queimar a cota do IP.
  if (ipHash) {
    const { data: jaFeitos } = await supabase.rpc("cadastros_feitos_pelo_ip", {
      p_ip_hash: ipHash,
    });

    if (((jaFeitos as number | null) ?? 0) >= CADASTROS_POR_IP) {
      return {
        ok: false,
        mensagem:
          "Esta conexão já atingiu o limite de cadastros. Se o bar é seu e você perdeu o acesso, entre pelo link no e-mail ou use 'Esqueceu a senha?'.",
      };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await origemDoApp()}/auth/callback` },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      return { ok: false, mensagem: "Este e-mail já está cadastrado. Tente entrar." };
    }
    return { ok: false, mensagem: "Não foi possível cadastrar. Tente novamente." };
  }

  if (ipHash) {
    await supabase.rpc("registrar_cadastro_do_ip", { p_ip_hash: ipHash });
  }

  // Com confirmação ligada o Supabase não devolve sessão — é o caminho normal.
  if (data.user && !data.session) {
    return {
      ok: true,
      mensagem: `Quase lá! Enviamos um e-mail de confirmação para ${email}. Abra a mensagem e toque no link para ativar o seu bar. Confira também o Spam.`,
    };
  }

  redirect("/onboarding");
}

/**
 * "Esqueceu a senha?" — manda o link de redefinição.
 *
 * O link cai em /auth/callback, que troca o token por uma sessão de
 * recuperação e encaminha para /nova-senha. Trocar senha sempre passa pelo
 * e-mail: é o que garante que quem troca é quem tem a caixa postal, e não
 * quem pegou o celular do balcão.
 */
export async function redefinirSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));

  if (problema === "formato") return { ok: false, mensagem: MENSAGEM_FORMATO };
  if (problema === "descartavel") return { ok: false, mensagem: MENSAGEM_DESCARTAVEL };

  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origemDoApp()}/auth/callback`,
  });

  if (error) {
    return { ok: false, mensagem: "Não foi possível enviar o e-mail de redefinição." };
  }

  // Resposta igual existindo a conta ou não: dizer "esse e-mail não existe"
  // entrega para qualquer um a lista de quem tem cadastro.
  return {
    ok: true,
    mensagem: `Se existe uma conta com ${email}, o link de redefinição já está a caminho. Confira também o Spam.`,
  };
}

/**
 * Pedido de troca de senha a partir do app, para quem já está logado.
 * Não troca nada aqui: manda o mesmo link de redefinição por e-mail.
 */
export async function pedirTrocaDeSenha(): Promise<EstadoForm> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, mensagem: "Não consegui identificar o e-mail da sua conta." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${await origemDoApp()}/auth/callback`,
  });

  if (error) {
    return { ok: false, mensagem: "Não foi possível enviar o link agora. Tente novamente." };
  }

  return {
    ok: true,
    mensagem: `Link enviado para ${user.email}. Abra o e-mail para cadastrar a nova senha.`,
  };
}

/**
 * Grava a senha nova. Só funciona com a sessão que o link de e-mail abriu —
 * sem link, não há sessão, e sem sessão o updateUser falha.
 */
export async function salvarNovaSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  if (senha.length < 8) {
    return { ok: false, mensagem: "A senha precisa ter pelo menos 8 caracteres." };
  }

  if (senha !== confirmarSenha) {
    return { ok: false, mensagem: "As senhas não coincidem." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      mensagem: "Este link expirou ou já foi usado. Peça um novo em 'Esqueceu a senha?'.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    if (/should be different|same as the old/i.test(error.message)) {
      return { ok: false, mensagem: "A nova senha precisa ser diferente da anterior." };
    }
    return { ok: false, mensagem: "Não foi possível salvar a senha. Tente novamente." };
  }

  // A raiz decide o destino (admin, onboarding ou dashboard) — mandar direto
  // pro /dashboard obrigava quem ainda não tem bar a saltar mais uma vez.
  redirect("/");
}

export async function sair() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
