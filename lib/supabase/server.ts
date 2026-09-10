import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_LEMBRAR, opcoesDeCookieDeSessao, querSessaoLonga } from "@/lib/sessao";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigurado() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Fluxo dos links enviados por e-mail (magic link e redefinição de senha).
 *
 * O padrão do @supabase/ssr é PKCE: junto com o link vai um "code verifier"
 * gravado em cookie NO NAVEGADOR QUE PEDIU. Quem abrir o link em outro
 * navegador não tem o verifier e o login falha.
 *
 * Isso quebra no celular, que é onde o app vive: o iOS abre o link do e-mail
 * no navegador padrão do aparelho. Quem pede o link no Safari e tem o Chrome
 * como padrão recebe um link que nunca vai funcionar. O mesmo vale para o app
 * instalado na tela inicial, que tem armazenamento separado do navegador.
 *
 * Com o fluxo `implicit` o token do e-mail se basta: o /auth/callback troca o
 * token por sessão em qualquer navegador. O que se perde é a amarração do link
 * ao navegador de origem — e ela vale pouco aqui, porque quem já tem acesso à
 * caixa postal consegue pedir um link novo de qualquer jeito. O token continua
 * de uso único e de vida curta.
 */
export const FLUXO_DE_EMAIL = "implicit" as const;

/**
 * Fluxo do "Entrar com Google" — e por que ele é o oposto do de cima.
 *
 * O argumento que derrubou o PKCE nos links de e-mail não vale aqui: o login
 * social começa e termina no MESMO navegador, em segundos, sem passar por
 * caixa de entrada nenhuma. O verifier gravado no cookie estará lá quando o
 * Google devolver a pessoa.
 *
 * E o `implicit` sequer funcionaria: sem PKCE o Supabase devolve os tokens no
 * FRAGMENTO da URL (`#access_token=…`), que o navegador nunca envia ao
 * servidor. O /auth/callback ficaria olhando uma URL vazia. Com PKCE vem
 * `?code=`, que é query e chega até nós.
 */
export const FLUXO_OAUTH = "pkce" as const;

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * No Next 16 `cookies()` é assíncrono — daí a função ser async.
 */
export async function createSupabaseServerClient(
  fluxo: typeof FLUXO_DE_EMAIL | typeof FLUXO_OAUTH = FLUXO_DE_EMAIL,
) {
  const cookieStore = await cookies();
  // Lido aqui, uma vez: é a escolha de "manter conectado" que a action gravou
  // antes de montar este cliente. Ver lib/sessao.ts.
  const sessaoLonga = querSessaoLonga(cookieStore.get(COOKIE_LEMBRAR)?.value);

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: fluxo },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            // httpOnly: nenhum componente cliente lê a sessão — o único uso do
            // Supabase no navegador é a página pública da comanda, que é
            // anônima. Sem isso, o token do dono fica legível por JavaScript na
            // mesma origem que serve /c/[token], e qualquer XSS futuro ali vira
            // tomada de conta.
            cookieStore.set(name, value, opcoesDeCookieDeSessao(options, sessaoLonga));
          }
        } catch {
          // Server Components não podem escrever cookies; o proxy.ts cuida
          // da renovação da sessão, então ignorar aqui é seguro.
        }
      },
    },
  });
}
