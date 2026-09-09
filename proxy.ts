import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_LEMBRAR, opcoesDeCookieDeSessao, querSessaoLonga } from "@/lib/sessao";

/**
 * No Next.js 16 o antigo `middleware` passou a se chamar `proxy`.
 * Aqui ele renova a sessão do Supabase (refresh token) e intercepta
 * administradores para enviá-los direto ao painel /admin.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem credenciais configuradas, o app roda em modo "não configurado".
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const sessaoLonga = querSessaoLonga(request.cookies.get(COOKIE_LEMBRAR)?.value);

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          // Ver lib/sessao.ts: a sessão nunca é lida pelo navegador, e a
          // validade do cookie segue o "manter conectado" que o dono escolheu.
          response.cookies.set(name, value, opcoesDeCookieDeSessao(options, sessaoLonga));
        }
      },
    },
  });

  // Precisa acontecer antes da resposta ser finalizada, senão um refresh
  // de token não consegue mais gravar os cookies novos.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const nextUrl = request.nextUrl;

  // Se for usuário autenticado, checa se é Super Admin para blindar rotas comuns
  if (user && (nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/onboarding"))) {
    const { data: admin } = await supabase
      .from("administradores")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (admin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // Respostas de autenticação nunca podem ser cacheadas por CDN.
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};