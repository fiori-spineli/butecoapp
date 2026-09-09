import { redirect } from "next/navigation";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { contextoDoDono } from "@/lib/bar";
import { OnboardingForm } from "./onboarding-form";
import { TemaToggle } from "@/components/tema-toggle";
import { BotaoSair } from "@/components/botao-sair";
import { LogoButeco } from "@/components/logo-buteco";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: admin } = await supabase
      .from("administradores")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (admin) redirect("/admin");
  }

  const { bar } = await contextoDoDono(); // Mantém contexto normal
  if (bar) redirect("/dashboard");

  return (
    <main className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex flex-col justify-between p-6 md:p-10">
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between">
        <LogoButeco className="w-36 h-12" priority />
        <div className="flex items-center gap-3">
          <TemaToggle />
          <BotaoSair />
        </div>
      </header>

      <div className="w-full max-w-md mx-auto my-auto rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            Como se chama o seu bar?
          </h1>
          <p className="mt-2 text-xs md:text-sm text-stone-500 dark:text-stone-400">
            Este é o nome que os seus clientes vão ver no topo da comanda quando escanearem o QR Code.
          </p>
        </div>

        <OnboardingForm />
      </div>

      <footer className="text-center text-xs text-stone-400 dark:text-stone-600">
        ButecoApp &bull; Configuração inicial do estabelecimento
      </footer>
    </main>
  );
}