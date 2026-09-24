import { exigirBar } from "@/lib/bar";
import { VoltarPara } from "@/components/voltar";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";
import { BotaoSair } from "@/components/botao-sair";
import { SenhaForm } from "./senha-form";
import { MensagemQrForm } from "./mensagem-qr-form";
import { BarConfigForm } from "./bar-config-form";
import { SeletorDeTema } from "@/components/seletor-de-tema";
import { AcessibilidadeForm } from "./acessibilidade-form";
import { BarFotoForm } from "./bar-foto-form";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const { bar } = await exigirBar();
  const { data: { user } } = await (await import("@/lib/supabase/server")).createSupabaseServerClient().then(s => s.auth.getUser());

  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-150">
      {/* Cabeçalho nivelado com o mesmo tamanho de logo de todo o sistema */}
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 min-h-16">
        <div className="flex items-center gap-3">
          <VoltarPara href="/dashboard" />
          <LogoButeco className="w-32 sm:w-36 h-10 sm:h-11 shrink-0" priority />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <TemaToggle />
          <BotaoSair />
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-2xl w-full mx-auto space-y-6">
        <div className="mb-2">
          <h1 className="text-xl md:text-2xl font-black text-stone-900 dark:text-stone-100">
            Ajustes do bar
          </h1>
          <p className="text-xs md:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Logado como <strong className="text-stone-800 dark:text-stone-200">{user?.email}</strong>
          </p>
        </div>

        {/* 1. Logotipo e Foto do Bar */}
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
            Logotipo / Foto do Bar
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
            Esta imagem aparecerá no topo do sistema e nas comandas dos seus clientes.
          </p>
          <BarFotoForm fotoAtual={bar.foto_url} />
        </div>

        {/* 2. Dados do Bar */}
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
            Dados e Horário de Funcionamento
          </h2>
          <BarConfigForm bar={bar} />
        </div>

        {/* 3. Senha */}
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
            Cadastrar ou alterar senha fixa
          </h2>
          <SenhaForm email={user?.email ?? ""} />
        </div>

        {/* 4. Acessibilidade */}
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
            Acessibilidade e Legibilidade
          </h2>
          <AcessibilidadeForm />
        </div>

        {/* 5. Aparência e Tema */}
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
            Aparência
          </h2>
          <SeletorDeTema />
        </div>

        {/* 6. Mensagem QR */}
        <div className="rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-2">
            Mensagem enviada com o QR Code
          </h2>
          <MensagemQrForm mensagemAtual={bar.mensagem_qr} nomeDoBar={bar.nome} />
        </div>
      </main>
    </div>
  );
}