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
  /** Ação própria da página (ex.: "Novo produto"), à esquerda de Perfil. */
  acoes?: React.ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      
      {/* Esquerda: Logo e Título visíveis em todas as telas */}
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <LogoButeco
          className="w-28 sm:w-32 md:w-44 lg:w-48 h-10 sm:h-10 md:h-14 lg:h-16 shrink-0"
          priority
        />
        <div className="min-w-0 border-l border-stone-200 dark:border-stone-800 pl-3">
          <h1 className="text-sm sm:text-[clamp(1.125rem,2vw,1.5rem)] font-black leading-tight text-stone-900 dark:text-stone-100 wrap-break-word line-clamp-2 sm:line-clamp-none">
            {titulo}
          </h1>
          {/* Subtítulo só aparece a partir de tablet para não espremer o celular */}
          {subtitulo && (
            <p className="hidden sm:block text-[clamp(0.7rem,1vw,0.75rem)] text-stone-500 dark:text-stone-400 mt-0.5 text-balance wrap-break-word">
              {subtitulo}
            </p>
          )}
        </div>
      </div>

      {/* Centro: Navegação Principal (Sempre alinhada ao meio no Desktop) */}
      <NavPrincipal ativo={ativo} />

      {/* Direita: Ações (Sempre alinhadas à direita) */}
      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
        {acoes}
        <Link
          href="/perfil"
          prefetch={true}
          className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 min-h-11 inline-flex items-center px-3 sm:px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          Perfil
        </Link>
        <BotaoSair />
      </div>
    </header>
  );
}