"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";

/**
 * Tela para erro inesperado em qualquer página do app.
 *
 * O Next.js já esconde a mensagem real do erro em produção (chega aqui só o
 * `digest`); esta tela existe para a pessoa não cair na página cinza padrão
 * e ter um botão de tentar de novo. O digest fica visível em letra pequena:
 * é o que liga o que o dono viu ao registro no log da Vercel.
 */
export default function PaginaDeErro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção o erro em si já foi para o log do servidor; no navegador
    // fica só o rastro para quem estiver com o console aberto.
    console.error(error);
  }, [error]);

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
        <h1 className="text-2xl font-black tracking-tight">Deu ruim por aqui</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Alguma coisa falhou ao montar esta tela. Nada do que você lançou se perdeu
          — tente de novo; se continuar, saia e entre outra vez.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-6 text-sm font-bold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          Tentar de novo
        </button>

        <Link
          href="/"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-stone-200 dark:border-stone-700 px-6 text-sm font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
        >
          Ir para o início
        </Link>

        {error.digest ? (
          <p className="mt-5 text-[11px] text-stone-400 dark:text-stone-600">
            Código do erro: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>

      <footer className="text-center text-xs text-stone-400 dark:text-stone-600">ButecoApp</footer>
    </main>
  );
}
