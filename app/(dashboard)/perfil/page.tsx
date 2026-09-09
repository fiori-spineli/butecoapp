import { exigirBar } from "@/lib/bar";
import { VoltarPara } from "@/components/voltar";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";
import { SenhaForm } from "./senha-form";
import { MensagemQrForm } from "./mensagem-qr-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const { supabase, bar } = await exigirBar();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-150">
      <header className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <VoltarPara href="/dashboard" />
          <LogoButeco className="w-24 sm:w-32 h-9 sm:h-10" />
        </div>
        <TemaToggle />
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-2xl w-full mx-auto">
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-black text-stone-900 dark:text-stone-100">
            Ajustes do bar
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

        <div className="mt-6 rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
            Mensagem enviada com o QR Code
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
            Quando você compartilha a comanda pelo WhatsApp, este texto vai junto com o
            link. Escreva do jeito que o seu bar fala.
          </p>

          <MensagemQrForm mensagemAtual={bar.mensagem_qr} nomeDoBar={bar.nome} />
        </div>
      </main>
    </div>
  );
}