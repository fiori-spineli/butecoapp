"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { createSupabaseAdminClient, serviceRoleConfigurado } from "@/lib/supabase/admin";
import { COOKIE_LEMBRAR } from "@/lib/sessao";
import { origemDoApp } from "@/lib/url";
import { analisarEmail } from "@/lib/email-descartavel";
import { problemaDaSenha } from "@/lib/senha";
import { MENSAGEM_SENHA_VAZADA, senhaApareceEmVazamento } from "@/lib/senha-vazada";
import {
  ROTA_RECUPERACAO,
  normalizarCodigo,
  precisaTrocarSenha,
  sessaoProvouOEmail,
} from "@/lib/recuperacao";
import {
  descartarProvaDeEmail,
  provaDeEmailValida,
  registrarProvaDeEmail,
} from "@/lib/prova-email";

export type EstadoForm = { ok: boolean; mensagem: string } | null;

/**
 * Resposta do pedido de código. `enviadoEm` é o que reinicia a contagem para
 * reenviar: cada pedido aceito traz um valor novo, e a tela usa esse valor
 * como `key` do cronômetro.
 */
export type EstadoRecuperacao = { ok: boolean; mensagem: string; enviadoEm?: number } | null;

const MENSAGEM_FORMATO = "Digite um e-mail válido.";

const MENSAGEM_CAPTCHA =
  "A verificação de segurança não passou. Espere ela terminar de carregar e tente de novo.";

const MENSAGEM_MUITAS_TENTATIVAS =
  "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";

/** 429 do Auth: limite por IP, por e-mail ou de envio do projeto. */
function ehLimiteDeTaxa(error: AuthError): boolean {
  return (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit"
  );
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
 *
 * A senha NÃO passa por trim(): espaço faz parte dela. Quem corta é a tela que
 * cria a senha — e ela não corta, recusa (ver lib/senha.ts).
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
      return { ok: false, mensagem: MENSAGEM_CAPTCHA };
    }
    if (ehLimiteDeTaxa(error)) {
      return { ok: false, mensagem: MENSAGEM_MUITAS_TENTATIVAS };
    }
    if (error.code === "user_banned") {
      return {
        ok: false,
        mensagem: "O acesso desta conta está suspenso. Fale com a gente pelo /contato.",
      };
    }
    if (
      error.message.includes("Invalid login credentials") ||
      error.code === "invalid_credentials"
    ) {
      // Mesma mensagem para "e-mail não existe" e "senha errada": dizer qual
      // dos dois falhou entregaria a um robô a lista de quem tem conta.
      return {
        ok: false,
        mensagem:
          "E-mail ou senha incorretos. Confira se o Caps Lock está desligado. Se não lembra a senha, toque em \"Esqueceu a senha?\" e crie uma nova com o código que enviamos por e-mail.",
      };
    }
    console.error("[login] falha inesperada do Auth", error.status, error.code);
    return { ok: false, mensagem: "Não foi possível entrar agora. Tente novamente em instantes." };
  }

  redirect("/");
}

/**
 * "Entrar com Google".
 *
 * Roda no servidor e devolve a pessoa para o Google. O cliente é PKCE — o
 * único que o @supabase/ssr sabe montar, e o único que serve aqui: sem PKCE o
 * Supabase devolveria os tokens no FRAGMENTO da URL (`#access_token=…`), que o
 * navegador nunca envia ao servidor. Com PKCE vem `?code=`, que chega até nós.
 * O verifier gravado no cookie estará lá quando o Google devolver a pessoa,
 * porque o login social começa e termina no mesmo navegador, em segundos.
 *
 * Não há CAPTCHA aqui de propósito: quem valida a identidade daqui em diante é
 * o Google, com a própria proteção contra robô dele.
 */
export async function entrarComGoogle(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  await registrarPreferenciaDeSessao(String(formData.get("lembrar") ?? "") === "on");

  const supabase = await createSupabaseServerClient();
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
 * Manda o e-mail de recuperação — o código de 8 dígitos e o link.
 *
 * Mesma resposta exista a conta ou não, como em qualquer banco ou loja
 * grande: dizer "esse e-mail não tem conta" entregaria a um robô a lista de
 * quem usa o sistema. As únicas recusas explícitas são as que independem de a
 * conta existir — CAPTCHA e limite de pedidos.
 *
 * Falha do provedor de e-mail vai para o log da Vercel, não para a tela: a
 * mensagem crua do Auth dizia, em inglês, exatamente o que a regra acima quer
 * esconder. A tela orienta a procurar no Spam e a falar com a gente.
 */
async function enviarCodigoDeRecuperacao(
  email: string,
  captchaToken: string | undefined,
): Promise<EstadoRecuperacao> {
  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Rota própria da recuperação — é ela que garante que o link termina em
    // "criar senha nova" e nunca num login comum. Ver lib/recuperacao.ts.
    redirectTo: `${await origemDoApp()}${ROTA_RECUPERACAO}`,
    captchaToken,
  });

  if (error) {
    if (/captcha/i.test(error.message)) return { ok: false, mensagem: MENSAGEM_CAPTCHA };
    if (ehLimiteDeTaxa(error)) {
      return {
        ok: false,
        mensagem:
          "Você pediu um código há pouco. Espere 1 minuto para pedir outro — o último que enviamos continua valendo.",
      };
    }
    console.error("[recuperacao] envio do e-mail falhou", error.status, error.code, error.message);
  }

  return {
    ok: true,
    mensagem:
      "Se existe uma conta com esse e-mail, as instruções acabaram de sair. Digite o código do e-mail aqui, ou toque no link que veio nele.",
    enviadoEm: Date.now(),
  };
}

/** "Esqueceu a senha?" na tela de login. */
export async function pedirCodigoDeRecuperacao(
  _anterior: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));
  // O teste de e-mail descartável não entra aqui: não existe conta com esse
  // tipo de endereço, e recusar diria algo sobre quem existe ou não.
  if (problema === "formato") return { ok: false, mensagem: MENSAGEM_FORMATO };

  return enviarCodigoDeRecuperacao(email, captchaDoFormulario(formData));
}

/**
 * Troca de senha a partir do Perfil, para quem já está logado.
 *
 * Passa pelo MESMO código por e-mail: trocar senha sempre exige a caixa
 * postal, para que o celular logado esquecido no balcão não vire troca de
 * senha. O e-mail vem da sessão, nunca do formulário.
 *
 * Antes esta action chamava o /recover sem o token do Turnstile; com o CAPTCHA
 * ligado no projeto o Auth recusava todas as vezes, e o botão do Perfil nunca
 * mandou e-mail nenhum.
 */
export async function pedirTrocaDeSenha(
  _anterior: EstadoRecuperacao,
  formData: FormData,
): Promise<EstadoRecuperacao> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, mensagem: "Sua sessão expirou. Entre de novo para trocar a senha." };
  }

  return enviarCodigoDeRecuperacao(user.email, captchaDoFormulario(formData));
}

/**
 * O código de 8 dígitos do e-mail.
 *
 * É a porta que funciona em qualquer aparelho: a pessoa lê o código no celular
 * e digita no computador do caixa, ou o contrário. E nenhum robô de e-mail
 * consegue gastá-lo, porque ele não é um link.
 */
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

  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: codigo, type: "recovery" });

  if (error || !data.user) {
    if (error && ehLimiteDeTaxa(error)) return { ok: false, mensagem: MENSAGEM_MUITAS_TENTATIVAS };
    return {
      ok: false,
      mensagem:
        "Código incorreto ou vencido. Confira os números — se você pediu mais de uma vez, só o último código vale.",
    };
  }

  await registrarProvaDeEmail(data.user.id);
  redirect("/nova-senha");
}

/**
 * O link do e-mail, depois que a pessoa tocou em "Criar nova senha".
 *
 * A troca acontece aqui, num POST, e não no GET que abre a página: robô de
 * e-mail e pré-visualização de link do WhatsApp abrem a URL sozinhos, e um GET
 * que gasta o token de uso único entregava à pessoa um link já morto. Ver
 * app/auth/recuperar/page.tsx.
 *
 * Aceita as duas formas que o link pode ter:
 * - `token_hash` — o template do projeto (supabase/templates/recovery.html).
 *   Funciona em qualquer aparelho.
 * - `code` — o template PADRÃO do Supabase, que passa pelo /verify dele e
 *   volta com um código PKCE. Só funciona no navegador que pediu o e-mail.
 */
export async function abrirLinkDeRecuperacao(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();

  if (!supabaseConfigurado()) {
    return { ok: false, mensagem: "Configuração do servidor ausente." };
  }

  const supabase = await createSupabaseServerClient();
  let userId: string | null = null;

  if (tokenHash) {
    // O tipo é fixo: esta porta só abre recuperação, venha o que vier na URL.
    const { data, error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (error || !data.user) {
      return {
        ok: false,
        mensagem: "Este link já foi usado ou venceu. Peça um código novo em \"Esqueceu a senha?\".",
      };
    }
    userId = data.user.id;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      return {
        ok: false,
        mensagem:
          "Este link só abre no mesmo aparelho e navegador em que você pediu o código. Digite o código do e-mail na tela de login, ou peça um novo.",
      };
    }
    userId = data.user.id;
  } else {
    return { ok: false, mensagem: "Link incompleto. Peça um código novo em \"Esqueceu a senha?\"." };
  }

  await registrarProvaDeEmail(userId);
  redirect("/nova-senha");
}

/**
 * Grava a senha nova.
 *
 * Só aceita quem acabou de provar que tem o e-mail (código ou link, nos
 * últimos 15 minutos) ou quem entrou com a senha provisória do backoffice.
 * Uma sessão comum — o celular logado esquecido no balcão — não troca senha:
 * precisa pedir o código.
 *
 * Depois de gravar, derruba as OUTRAS sessões da conta. É o que se espera de
 * "troquei a senha porque alguém podia estar usando": quem estava lá sai.
 */
export async function salvarNovaSenha(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      mensagem: "Sua sessão venceu. Peça um código novo em \"Esqueceu a senha?\".",
    };
  }

  const provisoria = precisaTrocarSenha(user);
  const provou =
    provisoria || (await provaDeEmailValida(user.id)) || (await sessaoProvouOEmail(supabase));

  if (!provou) {
    return {
      ok: false,
      mensagem:
        "Por segurança, confirme que é você antes: peça o código por e-mail e digite-o aqui.",
    };
  }

  const problema = problemaDaSenha(senha, user.email);
  if (problema) return { ok: false, mensagem: problema };

  if (senha !== confirmarSenha) {
    return { ok: false, mensagem: "As duas senhas não são iguais. Digite de novo." };
  }

  if (await senhaApareceEmVazamento(senha)) {
    return { ok: false, mensagem: MENSAGEM_SENHA_VAZADA };
  }

  const { error } = await supabase.auth.updateUser({ password: senha });

  if (error) {
    if (error.code === "same_password" || /should be different|same as the old/i.test(error.message)) {
      return { ok: false, mensagem: "A nova senha precisa ser diferente da atual." };
    }
    if (error.code === "weak_password") {
      return { ok: false, mensagem: "Essa senha é fraca demais. Use uma mais longa, com letras e números." };
    }
    if (error.code === "reauthentication_needed") {
      return {
        ok: false,
        mensagem: "Por segurança, confirme que é você: peça um código novo por e-mail.",
      };
    }
    console.error("[nova-senha] updateUser falhou", error.status, error.code);
    return { ok: false, mensagem: "Não foi possível salvar a senha. Tente novamente." };
  }

  if (provisoria && serviceRoleConfigurado()) {
    // app_metadata só a chave de serviço escreve. Se esta limpeza falhar, a
    // pessoa é mandada de volta para cá no próximo clique — e aí o Auth
    // recusaria a MESMA senha por ser igual. Por isso o erro aqui é dito.
    const { error: erroFlag } = await createSupabaseAdminClient().auth.admin.updateUserById(user.id, {
      app_metadata: { trocar_senha: false },
    });
    if (erroFlag) {
      console.error("[nova-senha] não limpou trocar_senha", erroFlag.status, erroFlag.code);
      return {
        ok: false,
        mensagem: "A senha foi salva, mas não consegui liberar o painel. Tente entrar de novo em instantes.",
      };
    }
  }

  // Derruba as outras sessões desta conta (outros celulares, outro navegador).
  // Falhar aqui não desfaz a troca — a senha já está gravada.
  await supabase.auth.signOut({ scope: "others" }).catch(() => undefined);
  await descartarProvaDeEmail();

  return { ok: true, mensagem: "Senha salva. Entrando no seu bar…" };
}

export async function sair() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
