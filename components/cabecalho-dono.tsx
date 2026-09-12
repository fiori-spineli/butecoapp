import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { BotaoSair } from "@/components/botao-sair";
import { NavPrincipal, type AbaAtiva } from "@/components/tab-bar";

/**
 * O cabeçalho das três telas principais do dono — um só, para as três.
 *
 * Antes cada página montava o seu, e o lado direito mudava de uma para outra:
 * o dashboard tinha Perfil e Sair, produtos tinha o botão de novo produto,
 * relatórios não tinha nada. Como o cabeçalho era `justify-between`, a
 * navegação era empurrada para um lugar diferente em cada tela — trocar de aba
 * mexia os próprios botões de lugar debaixo do dedo, e o seguinte caía onde o
 * anterior estava. No meio do movimento isso faz o garçom errar o toque.
 *
 * O conserto é estrutural, não cosmético: no desktop o cabeçalho é uma grade
 * de três colunas, `1fr auto 1fr`, e a navegação mora na do meio. As pontas
 * crescem e encolhem dentro do próprio 1fr (com `min-w-0` e truncagem, para um
 * nome de bar comprido não empurrar nada); o centro fica no mesmo lugar em
 * qualquer página e em qualquer largura.
 *
 * No celular a navegação não está aqui — é a barra de baixo (TabBar), no
 * alcance do polegar —, então o cabeçalho volta a ser um flex simples.
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
    <header className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <LogoButeco
          className="w-28 sm:w-36 md:w-44 lg:w-52 h-10 sm:h-12 md:h-16 lg:h-18"
          priority
        />
        {/* Título só a partir de lg: abaixo disso ele era espremido até virar
            reticências ("Ca…"), o que não informa nada e ainda roubava espaço
            da navegação. Quem está numa tela estreita já sabe onde está pela
            aba marcada. */}
        <div className="hidden min-w-0 border-l border-stone-200 dark:border-stone-800 pl-4 lg:block">
          <h1 className="truncate text-lg md:text-2xl font-black leading-tight text-stone-900 dark:text-stone-100">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{subtitulo}</p>
          )}
        </div>
      </div>

      <NavPrincipal ativo={ativo} />

      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
        {acoes}
        <Link
          href="/perfil"
          prefetch={true}
          className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 min-h-11 inline-flex items-center px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          Perfil
        </Link>
        <BotaoSair />
      </div>
    </header>
  );
}
