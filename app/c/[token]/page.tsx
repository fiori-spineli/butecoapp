import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarComandaPublica } from "@/lib/neon/queries";
import { ContaAoVivo } from "./conta-ao-vivo";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";

export const dynamic = "force-dynamic";

// O endereço desta página É a chave da conta do cliente: buscador nenhum deve
// guardá-lo, e nenhum link de saída deve levá-lo no Referer.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PaginaCliente({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const comanda = await buscarComandaPublica(token);

  if (!comanda) {
    notFound();
  }

  return (
    <main className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 px-4 py-8 md:py-12 transition-colors flex flex-col items-center">
      <div className="w-full max-w-lg flex items-center justify-between mb-6">
        <LogoButeco className="w-40 md:w-48 h-12 md:h-14" priority />
        <TemaToggle />
      </div>

      <div className="w-full max-w-lg rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-xl overflow-hidden">
        <ContaAoVivo token={token} inicial={comanda} />
      </div>

      <footer className="mt-8 text-center text-xs text-stone-500 dark:text-stone-400">
        Comanda digital &bull; Nenhum cadastro ou aplicativo necessário
      </footer>
    </main>
  );
}
