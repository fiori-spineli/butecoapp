"use client";

import { useActionState } from "react";
import { salvarNovaSenha, type EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";

export function NovaSenhaForm() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(
    salvarNovaSenha,
    null,
  );

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="senha"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
        >
          Nova senha (mínimo 8 caracteres)
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
          placeholder="••••••••"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 transition-all text-sm font-semibold"
        />
      </div>

      <div>
        <label
          htmlFor="confirmarSenha"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
        >
          Confirmar nova senha
        </label>
        <input
          id="confirmarSenha"
          name="confirmarSenha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="••••••••"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 transition-all text-sm font-semibold"
        />
      </div>

      {estado && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs leading-relaxed font-medium ${
            estado.ok
              ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
          }`}
        >
          {estado.mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-5 py-3.5 font-bold text-white shadow-xs transition-colors disabled:opacity-60 text-sm"
      >
        {enviando ? <LoadingButeco /> : "Salvar e entrar no bar"}
      </button>
    </form>
  );
}
