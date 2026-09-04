import Link from "next/link";

const abas = [
  { href: "/dashboard", chave: "comandas", rotulo: "Comandas" },
  { href: "/produtos", chave: "produtos", rotulo: "Produtos" },
] as const;

export function TabBar({ ativo }: { ativo: "comandas" | "produtos" }) {
  return (
    <nav className="sticky bottom-0 flex border-t border-stone-300 bg-white">
      {abas.map((aba) => {
        const selecionada = aba.chave === ativo;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            aria-current={selecionada ? "page" : undefined}
            className={`flex-1 border-t-2 px-2 pt-3.5 pb-5 text-center text-xs font-semibold ${
              selecionada
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-400"
            }`}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
