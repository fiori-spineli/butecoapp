import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/server";

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
  const proximo = searchParams.get("next") ?? "/dashboard";

  const cookieStore = await cookies();
  const paraGravar: { name: string; value: string; options: CookieOptions }[] = [];

  const responder = (destino: string) => {
    const resposta = NextResponse.redirect(`${origin}${destino}`);
    for (const { name, value, options } of paraGravar) {
      // httpOnly: a sessão nunca é lida pelo navegador — ver lib/supabase/server.ts.
      resposta.cookies.set(name, value, { ...options, httpOnly: true });
    }
    return resposta;
  };

  const falha = (motivo: string) => responder(`/login?erro=${motivo}`);

  // O próprio Supabase já rejeitou o token antes de nos redirecionar.
  // Acontece bastante quando um scanner de link do provedor de e-mail abre a
  // URL de verificação antes da pessoa e gasta o token de uso único.
  const erroSupabase = searchParams.get("error_code") ?? searchParams.get("error");
  if (erroSupabase) {
    return falha(erroSupabase.includes("expired") ? "expirado" : "link");
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return responder(proximo);
    // O verifier do PKCE vive num cookie do navegador que pediu o link.
    return falha("navegador");
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return responder(proximo);
    return falha("expirado");
  }

  return falha("link");
}
