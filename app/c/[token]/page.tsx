import { notFound } from "next/navigation";
import { createSupabaseAnonClient } from "@/lib/supabase/publico";
import { supabaseConfigurado } from "@/lib/supabase/server";
import type { ComandaPublica } from "@/lib/types";
import { ContaAoVivo } from "./conta-ao-vivo";

export const dynamic = "force-dynamic";

export default async function ContaPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!supabaseConfigurado()) notFound();

  const supabase = createSupabaseAnonClient();
  const { data, error } = await supabase.rpc("comanda_publica", { p_token: token });

  if (error || !data) notFound();

  return <ContaAoVivo token={token} inicial={data as ComandaPublica} />;
}
