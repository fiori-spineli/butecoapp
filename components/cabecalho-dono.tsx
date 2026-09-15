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
  titulo: string;
  subtitulo?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-y-4 gap-x-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-4">
      
      {/* Esquerda: Logo e Título Líquidos */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-[60%]">
        <LogoButeco
          className="w-[clamp(5rem,18vw,8rem)] h-auto shrink-0"
          priority
        />
        {/* A borda aparece sempre agora, e o título nunca é truncado */}
        <div className="border-l border-stone-200 dark:border-stone-800 pl-3 sm:pl-4">
          <h1 className="text-[clamp(1.125rem,4vw,1.5rem)] font-black leading-tight text-stone-900 dark:text-stone-100 text-balance wrap-break-word">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-[clamp(0.7rem,2.5vw,0.75rem)] text-stone-500 dark:text-stone-400 mt-0.5 text-pretty leading-snug">
              {subtitulo}
            </p>
          )}
        </div>
      </div>

      {/* Centro: Navegação Oculta no Mobile (migra para a TabBar) */}
      <NavPrincipal ativo={ativo} />

      {/* Direita: Ações que fluem para a linha de baixo se faltar espaço */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 dark:border-stone-800/50">
        {acoes}
        <Link
          href="/perfil"
          prefetch={true}
          className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 min-h-11 inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors flex-1 md:flex-none"
        >
          Perfil
        </Link>
        <BotaoSair />
      </div>
    </header>
  );
}