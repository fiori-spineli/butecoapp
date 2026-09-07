import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Destino do magic link. Aceita as duas formas que o Supabase pode enviar:
 * `?code=` (fluxo PKCE) e `?token_hash=&type=` (verificação de OTP).
 *
 * Em caso de falha, devolve ao /login um motivo específico — os três jeitos de
 * falhar aqui pedem ações diferentes de quem está tentando entrar.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const proximo = searchParams.get("next") ?? "/dashboard";

  const falha = (motivo: string) =>
    NextResponse.redirect(`${origin}/login?erro=${motivo}`);

  // O próprio Supabase já rejeitou o token antes de nos redirecionar.
  // Acontece bastante quando um scanner de link do provedor de e-mail abre a
  // URL de verificação antes da pessoa e gasta o token de uso único.
  const erroSupabase = searchParams.get("error_code") ?? searchParams.get("error");
  if (erroSupabase) {
    return falha(erroSupabase.includes("expired") ? "expirado" : "link");
  }

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${proximo}`);
    // O verifier do PKCE vive num cookie do navegador que pediu o link.
    return falha("navegador");
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${proximo}`);
    return falha("expirado");
  }

  return falha("link");
}
