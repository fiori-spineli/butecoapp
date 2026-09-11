import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { FLUXO_DE_EMAIL, FLUXO_OAUTH, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/server";
import { COOKIE_LEMBRAR, opcoesDeCookieDeSessao, querSessaoLonga } from "@/lib/sessao";
import { createSupabaseAdminClient, serviceRoleConfigurado } from "@/lib/supabase/admin";

/**
 * Apaga a conta que o OAuth criou para alguém sem acesso.
 *
 * Só é chamada quando já ficou provado que a conta não tem bar nem cargo de
 * admin — ou seja, ninguém do backoffice a criou. Sem a chave de serviço o app
 * apenas recusa a entrada e a conta órfã fica lá; recusar é o que protege, a
 * faxina é só higiene.
 */
async function descartarContaSemAcesso(userId: string) {
  if (!serviceRoleConfigurado()) return;
  try {
    await createSupabaseAdminClient().auth.admin.deleteUser(userId);
  } catch {
    // Nunca derruba o fluxo: a sessão já foi encerrada, que é o que importa.
  }
}

/**
 * Destino do magic link. Aceita as duas formas que o Supabase pode enviar:
 * `?code=` (fluxo PKCE) e `?token_hash=&type=` (verificação de OTP).
 *
 * Em caso de falha, devolve ao /login um motivo específico — os três jeitos de
 * falhar aqui pedem ações diferentes de quem está tentando entrar.
 *
 * O cliente é montado aqui em vez de usar createSupabaseServerClient() porque
 * esta rota devolve um NextResponse próprio: cookies escritos via `cookies()`
 * do next/headers não chegam nele com as opções intactas, e a sessão acabava
 * gravada sem httpOnly. Aqui os cookies são coletados e aplicados na resposta
 * que de fato volta pro navegador.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Sem `next`, cai na raiz: é ela que sabe se a pessoa vai para /admin,
  // /onboarding ou /dashboard. Só aceitamos caminho interno — um `next` com
  // URL absoluta viraria redirecionamento aberto para fora do app.
  const destinoPedido = searchParams.get("next");
  const proximo =
    destinoPedido && /^\/(?!\/)/.test(destinoPedido) ? destinoPedido : "/";

  const cookieStore = await cookies();
  const paraGravar: { name: string; value: string; options: CookieOptions }[] = [];

  const sessaoLonga = querSessaoLonga(cookieStore.get(COOKIE_LEMBRAR)?.value);

  const responder = (destino: string) => {
    const resposta = NextResponse.redirect(`${origin}${destino}`);
    for (const { name, value, options } of paraGravar) {
      // httpOnly e validade da sessão: ver lib/sessao.ts.
      resposta.cookies.set(name, value, opcoesDeCookieDeSessao(options, sessaoLonga));
    }
    return resposta;
  };

  const falha = (motivo: string) => responder(`/login?erro=${motivo}`);

  /**
   * Recusa a entrada e não deixa rastro de sessão.
   *
   * Não dá para reaproveitar `falha()` aqui: ela aplica os cookies coletados
   * com opcoesDeCookieDeSessao, que força validade de 30 dias. O signOut grava
   * cookie vazio com validade zero, e essa validade seria sobrescrita — o
   * navegador ficaria um mês reapresentando um cookie morto a cada requisição.
   * Aqui os cookies de sessão são apagados de verdade.
   */
  const recusar = (motivo: string) => {
    const resposta = NextResponse.redirect(`${origin}/login?erro=${motivo}`);
    for (const { name } of cookieStore.getAll()) {
      if (name.startsWith("sb-")) resposta.cookies.delete(name);
    }
    for (const { name } of paraGravar) {
      if (name.startsWith("sb-")) resposta.cookies.delete(name);
    }
    return resposta;
  };

  // O próprio Supabase já rejeitou o token antes de nos redirecionar.
  // Acontece bastante quando um scanner de link do provedor de e-mail abre a
  // URL de verificação antes da pessoa e gasta o token de uso único.
  const erroSupabase = searchParams.get("error_code") ?? searchParams.get("error");
  if (erroSupabase) {
    // "Unsupported provider: provider is not enabled" é o que volta enquanto o
    // Google não estiver ligado no painel do Supabase. Sem separar esse caso,
    // um botão que ninguém configurou ainda responde "link inválido", que
    // manda procurar o problema no lugar errado.
    const descricao = searchParams.get("error_description") ?? "";
    if (/provider/i.test(descricao)) return falha("google");

    return falha(erroSupabase.includes("expired") ? "expirado" : "link");
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // O fluxo tem de casar com o de quem gerou o que está chegando, e são
    // dois. `?code=` só nasce do login com Google, que usa PKCE; `token_hash`
    // vem dos e-mails, que usam implicit. Ver lib/supabase/server.ts.
    auth: { flowType: code ? FLUXO_OAUTH : FLUXO_DE_EMAIL },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        paraGravar.push(...cookiesToSet);
      },
    },
  });

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // O verifier do PKCE vive num cookie do navegador que pediu o link.
      return falha("navegador");
    }

    /*
     * A tranca do "Entrar com Google".
     *
     * O botão do Google abre a porta para QUALQUER conta Google do mundo —
     * basta chegar em /login e clicar. O desligamento de cadastro no painel do
     * Supabase deveria barrar conta nova por OAuth, mas a documentação não
     * garante isso (o próprio Supabase vende um hook pago para exatamente este
     * caso), e regra de negócio nossa não pode depender de um comportamento
     * que eu não consigo provar.
     *
     * Então a regra mora aqui, onde ela é nossa: sessão só vale para quem já
     * tem bar ou é admin. Conta só nasce no backoffice, feita por gente. Quem
     * clicar no Google sem ter recebido acesso entra e sai no mesmo instante,
     * com uma mensagem que diz o que fazer.
     */
    const usuario = data.user;
    if (usuario) {
      const [{ data: admin }, { data: bar }] = await Promise.all([
        supabase.from("administradores").select("id").eq("user_id", usuario.id).maybeSingle(),
        supabase.from("bars").select("id").eq("owner_id", usuario.id).maybeSingle(),
      ]);

      if (!admin && !bar) {
        await supabase.auth.signOut();
        // Se o Supabase chegou a criar a conta, ela some junto: ninguém pediu
        // para ficar com o e-mail de quem só clicou num botão.
        await descartarContaSemAcesso(usuario.id);
        return recusar("sem_acesso");
      }
    }

    return responder(proximo);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return falha("expirado");

    // O próprio tipo do token diz a intenção. Isso evita passar o destino como
    // `?next=` no redirectTo: o template monta o link como
    // `{{ .RedirectTo }}?token_hash=...`, e um redirectTo que já tivesse query
    // produziria uma URL com dois "?".
    if (type === "recovery") return responder("/nova-senha");

    return responder(proximo);
  }

  return falha("link");
}
