import type { Metadata } from "next";
import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";
import { ConviteForm } from "./convite-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Criar acesso — ButecoApp",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function RecuperarPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";
  const token = typeof params.convite === "string" ? params.convite : "";
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && /^[0-9a-f]{64}$/.test(token);
  return <main className="flex min-h-dvh flex-col bg-stone-100 p-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between">
      <Link href="/"><LogoButeco className="h-12 w-36" priority /></Link><TemaToggle />
    </header>
    <section className="mx-auto my-auto w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-xl dark:border-stone-800 dark:bg-stone-900">
      <h1 className="text-2xl font-black">Criar senha de acesso</h1>
      {valid ? <><p className="mt-3 text-sm">Confirme o convite para {email} e escolha sua senha.</p>
        <ConviteForm email={email} token={token} /></> :
        <><p className="mt-3 text-sm">O convite está incompleto ou inválido.</p>
          <Link className="mt-5 inline-block text-amber-700 underline" href="/login?modo=recuperar">Pedir um código novo</Link></>}
    </section>
  </main>;
}
