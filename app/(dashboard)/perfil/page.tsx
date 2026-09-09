import { exigirBar } from "@/lib/bar";
import { VoltarPara } from "@/components/voltar";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";
import { SenhaForm } from "./senha-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const { supabase } = await exigirBar();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-150">
      <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <VoltarPara href="/dashboard" />
          <LogoButeco className="w-32 h-10" />
        </div>
        <TemaToggle />
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-2xl w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-black text-stone-900 dark:text-stone-100">
            Segurança e Acesso
          </h1>
          <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Logado como <strong className="text-stone-800 dark:text-stone-200">{user?.email}</strong>
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
            Cadastrar ou alterar senha fixa
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
            Com uma senha cadastrada você entra tanto pelo link no e-mail quanto digitando e-mail e senha. O cadastro é feito por um link que enviamos para a sua caixa postal.
          </p>

          <SenhaForm />
        </div>
      </main>
    </div>
  );
}