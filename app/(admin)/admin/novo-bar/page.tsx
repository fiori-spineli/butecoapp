import { redirect } from "next/navigation";
import { checarSeEhAdmin } from "@/app/actions/admin";
import { verificarStatusMFA } from "@/app/actions/mfa";
import { VoltarPara } from "@/components/voltar";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";
import { BotaoSair } from "@/components/botao-sair";
import { NovoBarForm } from "./novo-bar-form";

export const dynamic = "force-dynamic";

export default async function NovoBarPage() {
  const ehAdmin = await checarSeEhAdmin();
  if (!ehAdmin) redirect("/dashboard");

  const statusMfa = await verificarStatusMFA();
  if (!statusMfa.temFatorAtivo || statusMfa.precisaVerificar) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors p-6 md:p-10">
      <div className="mx-auto max-w-3xl flex flex-col gap-8">
        {/* Cabeçalho */}
        <header className="flex items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
          <div className="flex items-center gap-3">
            <VoltarPara href="/admin" />
            <LogoButeco className="w-32 md:w-44 h-12 md:h-16" priority />
            <div className="hidden sm:block border-l border-stone-300 dark:border-stone-700 pl-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Backoffice
              </span>
              <h1 className="text-xl font-black tracking-tight">Criar Conta de Dono de Bar</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <TemaToggle />
            <BotaoSair />
          </div>
        </header>

        {/* Formulário */}
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-lg font-black text-stone-900 dark:text-stone-100">
              Cadastrar Novo Estabelecimento
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              Preencha os dados abaixo para gerar o acesso do bar. Você pode definir uma senha fixa imediatamente ou gerar um link de ativação para enviar pelo WhatsApp.
            </p>
          </div>

          <NovoBarForm />
        </div>
      </div>
    </main>
  );
}