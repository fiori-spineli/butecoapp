"use client";

import { useActionState } from "react";
import { criarBar } from "@/app/actions/bar";
import type { EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";

export function OnboardingForm() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(criarBar, null);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="nome"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
        >
          Nome do estabelecimento
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoFocus
          placeholder="Ex: Buteco do Marquinho"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all text-sm font-semibold"
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-4 font-bold text-white shadow-xs transition-colors disabled:opacity-60"
      >
        {enviando ? <LoadingButeco /> : "Criar e acessar meu bar"}
      </button>

      {estado && !estado.ok ? (
        <p role="alert" className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-900 dark:text-rose-200">
          {estado.mensagem}
        </p>
      ) : null}
    </form>
  );
}