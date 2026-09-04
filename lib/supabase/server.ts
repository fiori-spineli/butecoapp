import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigurado() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * No Next 16 `cookies()` é assíncrono — daí a função ser async.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components não podem escrever cookies; o proxy.ts cuida
          // da renovação da sessão, então ignorar aqui é seguro.
        }
      },
    },
  });
}
