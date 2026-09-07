import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * No Next.js 16 o antigo `middleware` passou a se chamar `proxy`.
 * Aqui ele existe só para renovar a sessão do Supabase (refresh token)
 * a cada requisição — a autorização de verdade continua no RLS do Postgres.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem credenciais configuradas, o app roda em modo "não configurado".
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

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
          // Ver o comentário em lib/supabase/server.ts: a sessão nunca é lida
          // pelo navegador, então ela não precisa ficar exposta ao JavaScript.
          response.cookies.set(name, value, { ...options, httpOnly: true });
        }
      },
    },
  });

  // Precisa acontecer antes da resposta ser finalizada, senão um refresh
  // de token não consegue mais gravar os cookies novos.
  await supabase.auth.getUser();

  // Respostas de autenticação nunca podem ser cacheadas por CDN.
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
