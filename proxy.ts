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
  //
  // O refresh pode falhar por um motivo banal: o navegador voltou com um
  // cookie de sessão que já não vale (expirou, foi revogado, ou o usuário foi
  // apagado). Isso não é erro de aplicação — é gente deslogada. Sem tratar,
  // o cookie morto volta a cada requisição daquele navegador e enche o log da
  // Vercel com "Invalid Refresh Token: Refresh Token Not Found".
  let user = null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    user = data.user;
  } catch (erro) {
    const codigo = (erro as { code?: string } | null)?.code;
    const sessaoMorta =
      codigo === "refresh_token_not_found" || codigo === "refresh_token_already_used";

    // Só engolimos a falha que sabemos ser sessão vencida. Qualquer outra
    // (Supabase fora do ar, rede) precisa continuar aparecendo.
    if (!sessaoMorta) throw erro;

    // Apaga o cookie que já não serve, para o navegador parar de reapresentá-lo
    // a cada página. Sem isso o mesmo erro se repete indefinidamente.
    for (const { name } of request.cookies.getAll()) {
      if (name.startsWith("sb-")) response.cookies.delete(name);
    }
  }

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