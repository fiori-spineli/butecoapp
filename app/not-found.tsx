import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";

/**
 * Página que não existe. Sem ela o Next.js mostra a tela padrão dele — em
 * inglês, sem a cara do app e sem caminho de volta.
 *
 * A comanda do cliente (/c/<token>) tem a própria "não encontrada", com o
 * texto certo para quem chegou por um QR velho; esta aqui é a genérica.
 */
export default function PaginaNaoEncontrada() {
  return (
    <main className="min-h-dvh w-full flex flex-col justify-between p-6 md:p-10">
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="inline-block cursor-pointer">
          <LogoButeco className="w-36 h-12" priority />
        </Link>
        {/* Além do botão, é o que aplica o tema salvo — sem ele a página
            abriria clara para quem usa o app no escuro. */}
        <TemaToggle />
      </header>

      <div className="w-full max-w-md mx-auto my-auto rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl text-center">
        <p className="text-5xl font-black tracking-tight text-amber-700 dark:text-amber-500">404</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Essa página não existe</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          O endereço pode ter sido digitado errado, ou a página saiu do ar.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-6 text-sm font-bold text-white shadow-xs transition-all active:scale-95"
        >
          Voltar ao início
        </Link>
      </div>

      <footer className="text-center text-xs text-stone-400 dark:text-stone-600">ButecoApp</footer>
    </main>
  );
}
