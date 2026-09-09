import Image from "next/image";
import { notFound } from "next/navigation";
import { createSupabaseAnonClient } from "@/lib/supabase/publico";
import { ContaAoVivo } from "./conta-ao-vivo";
import { TemaToggle } from "@/components/tema-toggle";
import type { ComandaPublica } from "@/lib/types";
import { LogoButeco } from "@/components/logo-buteco";

export const dynamic = "force-dynamic";

export default async function PaginaCliente({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createSupabaseAnonClient();

  const { data } = await supabase.rpc("comanda_publica", { p_token: token });
  const comanda = data as ComandaPublica | null;

  if (!comanda) notFound();

  return (
    <main className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-4 py-8 md:py-12 transition-colors flex flex-col items-center">
      {/* Topo com Logo e Toggle de Tema */}
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <LogoButeco className="w-40 md:w-48 h-12 md:h-14" priority />
        <TemaToggle />
      </div>

      {/* Cartão Central da Comanda com Design Rústico */}
      <div className="w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden">
        <ContaAoVivo token={token} inicial={comanda} />
      </div>

      <footer className="mt-8 text-center text-xs text-stone-500 dark:text-stone-400">
        Comanda digital &bull; Nenhum cadastro ou aplicativo necessário
      </footer>
    </main>
  );
}