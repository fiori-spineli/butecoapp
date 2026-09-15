import Link from "next/link";

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
            prefetch={false}
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

export function NavPrincipal({ ativo }: { ativo: AbaAtiva }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="flex items-center gap-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-800/60 p-1"
    >
      {abas.map((aba) => {
        const selecionada = aba.chave === ativo;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            prefetch={false}
            aria-current={selecionada ? "page" : undefined}
            className={`cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-lg px-3.5 text-xs font-bold transition-colors ${
              selecionada
                ? "bg-white dark:bg-stone-900 text-amber-800 dark:text-amber-400 shadow-xs"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <Icone>{aba.icone}</Icone>
            <span className="hidden md:inline">{aba.rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}