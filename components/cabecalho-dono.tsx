import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { BotaoSair } from "@/components/botao-sair";
import { NavPrincipal, type AbaAtiva } from "@/components/tab-bar";

export function CabecalhoDono({
  ativo,
  titulo,
  subtitulo,
  acoes,
}: {
  ativo: AbaAtiva;
  titulo?: string; // Tornamos opcional se quiser esconder
  subtitulo?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4 md:grid md:grid-cols-[auto_1fr_auto]">
      
      <div className="flex items-center gap-3 sm:gap-4">
        <LogoButeco
          className="w-28 sm:w-32 md:w-44 lg:w-48 h-10 sm:h-12 md:h-14 lg:h-16 shrink-0"
          priority
        />
        {titulo && (
            <div className="hidden min-w-0 border-l border-stone-200 dark:border-stone-800 pl-4 lg:block">
            <h1 className="text-[clamp(1.125rem,2vw,1.5rem)] font-black leading-tight text-stone-900 dark:text-stone-100 wrap-break-word">
                {titulo}
            </h1>
            {subtitulo && (
                <p className="text-[clamp(0.7rem,1vw,0.75rem)] text-stone-500 dark:text-stone-400 mt-0.5 text-balance wrap-break-word">
                {subtitulo}
                </p>
            )}
            </div>
        )}
      </div>

      <div className="flex justify-center w-full md:w-auto order-1 md:order-0 pt-2 md:pt-0">
        <NavPrincipal ativo={ativo} />
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
        {acoes}
        <Link
          href="/perfil"
          prefetch={true}
          className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 min-h-11 inline-flex items-center px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          Perfil
        </Link>
        <BotaoSair />
      </div>
    </header>
  );
}