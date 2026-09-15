import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Rotas estáticas, ícones e assets nunca são bloqueados
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/comanda") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg")
  ) {
    return NextResponse.next();
  }

  // 2. Rotas PÚBLICAS: A comanda do cliente (/c/...), contato, vitrine e auth nunca pedem login
  if (
    pathname.startsWith("/c/") ||
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/contato" ||
    pathname === "/privacidade" ||
    pathname.startsWith("/auth/callback")
  ) {
    return NextResponse.next();
  }

  // 3. Rotas privadas (Dashboard, Admin, Comanda do Dono, Produtos, Relatórios)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Se não estiver autenticado e tentar acessar o painel privado, redireciona para o login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};