import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";

export default function ComandaNaoEncontrada() {
  return (
    <main className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-6 flex flex-col items-center justify-center text-center">
      <LogoButeco className="w-40 h-14 mb-6" />
      <div className="max-w-md w-full rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl">
        <h1 className="text-2xl font-black mb-2">Comanda não encontrada</h1>
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-6">
          Essa comanda não existe ou o link expirou (comandas fechadas deixam de ser públicas após 24 horas).
        </p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-600 px-6 text-xs font-bold text-white transition-colors"
        >
          Ir para a página inicial
        </Link>
      </div>
    </main>
  );
}