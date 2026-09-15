import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { BotaoSair } from "@/components/botao-sair";
import { NavPrincipal, type AbaAtiva } from "@/components/tab-bar";

/**
 * O cabeçalho das três telas principais do dono — um só, para as três.
 * 
 * Agora ele utiliza flex-wrap para garantir que em telas de celulares muito pequenas
 * os botões nunca fiquem sobrepostos à Logo.
 */
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
    <header className="flex flex-wrap items-center justify-between gap-y-3 gap-x-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      
      {/* Esquerda: Logo e Título */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <LogoButeco
          className="w-24 sm:w-32 md:w-44 lg:w-52 h-8 sm:h-10 md:h-16 lg:h-18"
          priority
        />
        <div className="hidden min-w-0 border-l border-stone-200 dark:border-stone-800 pl-4 lg:block">
          <h1 className="truncate text-lg md:text-2xl font-black leading-tight text-stone-900 dark:text-stone-100">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{subtitulo}</p>
          )}
        </div>
      </div>

      {/* Centro: Navegação (Visível a partir de Tablets) */}
      <NavPrincipal ativo={ativo} />

      {/* Direita: Ações responsivas, Perfil e Sair */}
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