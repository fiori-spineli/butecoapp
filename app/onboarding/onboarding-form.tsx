"use client";

import { useActionState } from "react";
import { criarBar } from "@/app/actions/bar";
import type { EstadoForm } from "@/app/actions/auth";

export function OnboardingForm() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(criarBar, null);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="nome"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
        >
          Nome do bar
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoFocus
          placeholder="Buteco do Marquinho"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3.5 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-stone-900 px-4 py-3.5 font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {enviando ? "Criando…" : "Criar meu bar"}
      </button>

      {estado && !estado.ok ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {estado.mensagem}
        </p>
      ) : null}
    </form>
  );
}
