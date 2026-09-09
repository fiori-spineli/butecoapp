import Link from "next/link";

const abas = [
  { href: "/dashboard", chave: "comandas", rotulo: "Comandas" },
  { href: "/produtos", chave: "produtos", rotulo: "Produtos" },
  { href: "/relatorios", chave: "relatorios", rotulo: "Relatórios" },
] as const;

export function TabBar({ ativo }: { ativo: "comandas" | "produtos" | "relatorios" }) {
  return (
    <nav className="sticky bottom-0 z-20 flex border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md transition-all">
      {abas.map((aba) => {
        const selecionada = aba.chave === ativo;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            prefetch={true}
            aria-current={selecionada ? "page" : undefined}
            className={`cursor-pointer flex-1 border-t-2 px-3 pt-3.5 pb-5 text-center text-xs font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 ${
              selecionada
                ? "border-amber-700 dark:border-amber-500 text-amber-800 dark:text-amber-400"
                : "border-transparent text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            }`}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}