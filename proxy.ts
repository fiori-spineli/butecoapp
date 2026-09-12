import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_LEMBRAR, opcoesDeCookieDeSessao, querSessaoLonga } from "@/lib/sessao";
import { gerarNonce, montarCsp } from "@/lib/csp";

/**
 * No Next.js 16 o antigo `middleware` passou a se chamar `proxy`.
 * Aqui ele renova a sessão do Supabase (refresh token), intercepta
 * administradores para enviá-los direto ao painel /admin e carimba a
 * Content-Security-Policy com o nonce desta requisição (ver lib/csp.ts).
 */
export async function proxy(request: NextRequest) {
  const nonce = gerarNonce();
  const csp = montarCsp(nonce, process.env.NODE_ENV === "development");

  // O Next.js lê a CSP e o nonce dos cabeçalhos DA REQUISIÇÃO para carimbar os
  // <script> que ele mesmo gera. Por isso os dois vão nos dois sentidos: na
  // requisição que segue para a página e na resposta que volta ao navegador.
  // Os cabeçalhos são copiados na hora de montar a resposta, e não antes,
  // porque o setAll abaixo altera o cookie da requisição no meio do caminho.
  const seguir = () => {
    const cabecalhos = new Headers(request.headers);
    cabecalhos.set("x-nonce", nonce);
    cabecalhos.set("Content-Security-Policy", csp);
    const resposta = NextResponse.next({ request: { headers: cabecalhos } });
    resposta.headers.set("Content-Security-Policy", csp);
    return resposta;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem credenciais configuradas, o app roda em modo "não configurado".
  if (!url || !anonKey) return seguir();

  let response = seguir();
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
        response = seguir();
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
  // ATENÇÃO: este bloco NÃO pode lançar. O proxy roda em toda requisição, então
  // qualquer exceção aqui vira 500 no site inteiro — inclusive na página do
  // cliente, que nem sessão tem. Erro aqui é informação, nunca exceção.
  let user = null;

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    // Visitante sem sessão cai aqui, e isso é o caso normal — não é falha.
    // O que vale tratar é o cookie de refresh que já morreu: sem apagá-lo, o
    // navegador o reapresenta a cada página e o log enche de
    // "Invalid Refresh Token: Refresh Token Not Found".
    const codigo = (error as { code?: string }).code;

    // Só o token que NÃO EXISTE MAIS autoriza apagar o cookie.
    //
    // `refresh_token_already_used` era tratado igual, e é caso de CORRIDA: duas
    // requisições da mesma aba renovam ao mesmo tempo, uma ganha e grava a
    // sessão nova, a outra recebe "já usado". Apagar os cookies ali jogava
    // fora a sessão que a primeira acabou de gravar — deslogando alguém que
    // estava trabalhando. Com a tela se atualizando a cada 2 s (ver
    // components/atualizacao-ao-vivo.tsx), essa corrida deixou de ser rara.
    if (codigo === "refresh_token_not_found") {
      for (const { name } of request.cookies.getAll()) {
        if (name.startsWith("sb-")) response.cookies.delete(name);
      }
    }
  } else {
    user = data.user;
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
