"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  FLUXO_OAUTH,
  createSupabaseServerClient,
  supabaseConfigurado,
} from "@/lib/supabase/server";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { origemDoApp } from "@/lib/url";
import { MENSAGEM_DESCARTAVEL, analisarEmail } from "@/lib/email-descartavel";

export type EstadoForm = { ok: boolean; mensagem: string } | null;

const MENSAGEM_FORMATO = "Digite um e-mail válido.";

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

/** O token do Turnstile que o formulário mandou junto. */
function captchaDoFormulario(formData: FormData): string | undefined {
  const token = String(formData.get("cf-turnstile-response") ?? "").trim();
  return token || undefined;
}

/**
 * Login tradicional por e-mail e senha.
 *
 * O `captchaToken` vai para o próprio Supabase conferir com a Cloudflare. Por
 * isso não conferimos aqui: a validação no endpoint de auth vale também para
 * quem chamar a API por fora deste formulário, que é justamente o que um robô
 * de força bruta faria.
 */
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
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken: captchaDoFormulario(formData) },
  });

  if (error) {
    if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
      return {
        ok: false,
        mensagem:
          "Sua conta ainda não foi confirmada. Abra o e-mail que enviamos e toque no link de confirmação.",
      };
    }
    if (/captcha/i.test(error.message)) {
      return {
        ok: false,
        mensagem: "A verificação de segurança falhou. Recarregue a página e tente de novo.",
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
 * "Entrar com Google".
 *
 * Roda no servidor e devolve a pessoa para o Google. O cliente precisa ser o
 * de PKCE — ver FLUXO_OAUTH em lib/supabase/server.ts para o porquê de ele
 * divergir do fluxo dos links de e-mail.
 *
 * Não há CAPTCHA aqui de propósito: quem valida a identidade daqui em diante é
 * o Google, com a própria proteção contra robô dele. Um CAPTCHA antes de sair
 * do site só atrasaria quem já está sendo verificado do outro lado.
 */
export async function entrarComGoogle(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  await registrarPreferenciaDeSessao(String(formData.get("lembrar") ?? "") === "on");

  const supabase = await createSupabaseServerClient(FLUXO_OAUTH);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await origemDoApp()}/auth/callback`,
      // Sem isso o Google entra direto com a última conta usada. Quem tem a
      // conta do bar separada da pessoal precisa poder escolher.
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data?.url) {
    return { ok: false, mensagem: "Não consegui abrir o login do Google agora. Tente novamente." };
  }

  redirect(data.url);
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
    captchaToken: captchaDoFormulario(formData),
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
