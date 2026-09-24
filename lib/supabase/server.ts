import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { COOKIE_LEMBRAR, opcoesDeCookieDeSessao, querSessaoLonga } from "@/lib/sessao";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigurado() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * No Next 16 `cookies()` é assíncrono — daí a função ser async.
 *
 * O fluxo é SEMPRE PKCE, e não por escolha nossa: o @supabase/ssr grava
 * `flowType: "pkce"` DEPOIS de espalhar as opções recebidas
 * (node_modules/@supabase/ssr/dist/main/createServerClient.js, `...options?.auth`
 * seguido de `flowType: "pkce"`). Até 2026-09-23 este arquivo passava
 * `implicit` para os links de e-mail e um comentário explicava por quê; a
 * biblioteca descartava o valor em silêncio, e o link de recuperação chegava
 * como `?code=` — que só funciona no navegador que pediu e que o callback
 * confundia com o login do Google. Ver GUARDRAILS.md seção 13.
 *
 * O que torna os e-mails independentes de navegador não é o flowType: é o
 * template do e-mail mandar `token_hash` (ou o código de 8 dígitos), que o
 * servidor troca por sessão com verifyOtp em qualquer aparelho. Ver
 * supabase/templates/recovery.html e lib/recuperacao.ts.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  // Lido aqui, uma vez: é a escolha de "manter conectado" que a action gravou
  // antes de montar este cliente. Ver lib/sessao.ts.
  const sessaoLonga = querSessaoLonga(cookieStore.get(COOKIE_LEMBRAR)?.value);

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
