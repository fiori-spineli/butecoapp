import { createClient } from "@supabase/supabase-js";

/**
 * Cliente anônimo, sem sessão — usado só para a página pública do cliente,
 * que chama a função comanda_publica(token). O anon NÃO tem SELECT nas
 * tabelas: o token é o que dá acesso, e só àquela comanda.
 */
export function createSupabaseAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
