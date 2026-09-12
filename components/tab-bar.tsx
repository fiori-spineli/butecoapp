import Link from "next/link";

/**
 * Navegação principal do dono — em dois lugares, um para cada mão.
 *
 * No celular ela vive embaixo, no alcance do polegar, que é onde a mão está
 * quando se atende de pé com o aparelho numa mão só. No computador do caixa
 * ela sobe para o cabeçalho: barra colada no rodapé de uma tela de 24" fica
 * longe dos olhos e longe do mouse, e lá embaixo ninguém procura menu.
 *
 * Os rótulos ganharam ícone porque a barra é o mapa do app: o desenho é lido
 * antes da palavra, e no meio do movimento essa fração conta.
 */

export type AbaAtiva = "comandas" | "produtos" | "relatorios";

const abas = [
  {
    href: "/dashboard",
    chave: "comandas",
    rotulo: "Comandas",
    icone: (
      <>
        <path d="M8 2v4M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    href: "/produtos",
    chave: "produtos",
    rotulo: "Produtos",
    icone: (
      <>
        <path d="M5 8h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
        <path d="M9 8V5a3 3 0 0 1 6 0v3" />
      </>
    ),
  },
  {
    href: "/relatorios",
    chave: "relatorios",
    rotulo: "Relatórios",
    icone: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-5 3 3 5-7" />
      </>
    ),
  },
] as const;

function Icone({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

/** Barra inferior. Só no celular — ver o comentário no topo do arquivo. */
export function TabBar({ ativo }: { ativo: AbaAtiva }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-20 flex border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 sm:hidden"
    >
      {abas.map((aba) => {
        const selecionada = aba.chave === ativo;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            prefetch={true}
            aria-current={selecionada ? "page" : undefined}
            className={`cursor-pointer flex flex-1 flex-col items-center gap-1 border-t-2 px-2 pt-2.5 pb-5 text-center text-[11px] font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 ${
              selecionada
                ? "border-amber-700 dark:border-amber-500 text-amber-800 dark:text-amber-400"
                : "border-transparent text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            }`}
          >
            <Icone>{aba.icone}</Icone>
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mesmo destino, no cabeçalho, a partir do tablet. */
export function NavPrincipal({ ativo }: { ativo: AbaAtiva }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="hidden sm:flex items-center gap-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-800/60 p-1"
    >
      {abas.map((aba) => {
        const selecionada = aba.chave === ativo;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            prefetch={true}
            aria-current={selecionada ? "page" : undefined}
            className={`cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-lg px-3 lg:px-4 text-xs font-bold transition-colors ${
              selecionada
                ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-400 shadow-xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <Icone>{aba.icone}</Icone>
            {/* Rótulo só a partir de lg. Entre 768 e 1023 o cabeçalho ainda
                carrega logo, navegação, a ação da página, Perfil e Sair: com
                as três palavras escritas o conjunto não cabia e o botão da
                página passava POR CIMA de "Relatórios". Ícone sozinho resolve
                sem tirar nada da tela — e o alvo de toque continua o mesmo. */}
            <span className="hidden lg:inline">{aba.rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}
