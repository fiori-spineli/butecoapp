"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para o navegador (chave anônima). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  );
}
