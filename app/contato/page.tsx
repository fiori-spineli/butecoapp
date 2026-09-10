import type { Metadata } from "next";
import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";
import { ContatoForm } from "./contato-form";

export const metadata: Metadata = {
  title: "Pedir acesso ao ButecoApp",
  description:
    "Conte pra gente sobre o seu bar. A conta é criada por nós, à mão — não existe cadastro automático.",
};

/**
 * A única porta de entrada de bar novo.
 *
 * Repare no que NÃO tem aqui: nenhum link para criar conta, nenhuma senha,
 * nenhum caminho que leve a um cadastro automático. Quem chega nesta página só
 * consegue deixar um recado — e é isso que garante que um robô, mesmo passando
 * por tudo, não consiga criar um único bar no banco.
 */
export default function ContatoPage() {
  return (
    <main className="min-h-dvh bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="cursor-pointer">
            <LogoButeco className="w-32 sm:w-40 h-11 sm:h-14" priority />
          </Link>
          <div className="flex items-center gap-2">
            <TemaToggle />
            <Link
              href="/"
              className="cursor-pointer inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-stone-500 dark:text-stone-400 underline-offset-4 transition-colors hover:text-stone-900 dark:hover:text-stone-100 hover:underline"
            >
              Voltar
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          Vamos colocar o seu bar no ar
        </h1>
        <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300">
          O ButecoApp não tem cadastro automático. Você conta pra gente quem é e qual
          é o bar, a gente prepara o acesso e manda pra você o quanto antes. Quem cria
          a conta somos nós dois, o Samuel e o Lucas.
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Sem custo para testar", "A gente prefere que você use antes de decidir."],
            ["Sem cartão", "Nenhum dado de pagamento é pedido em lugar nenhum."],
            ["Sem instalar nada", "Abre no navegador do celular que você já tem."],
          ].map(([titulo, texto]) => (
            <li
              key={titulo}
              className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4"
            >
              <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                {titulo}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
                {texto}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 sm:p-8 shadow-xs">
          <ContatoForm />
        </div>

        {/* Sem link para o login aqui também: esta tela é da pessoa que ainda
            não é cliente. Quem já é entra pelo endereço que recebeu. */}
        <p className="mt-6 text-center text-xs text-stone-500 dark:text-stone-400">
          Suas informações ficam só com a gente.
        </p>
      </div>
    </main>
  );
}
