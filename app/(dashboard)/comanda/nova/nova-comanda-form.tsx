"use client";

import { useActionState } from "react";
import { criarComanda } from "@/app/actions/comandas";
import type { EstadoForm } from "@/app/actions/auth";

export function NovaComandaForm() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(criarComanda, null);

  return (
    <form action={acao} className="flex flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <label
          htmlFor="nome"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
        >
          Nome da comanda
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoFocus
          placeholder="Zé, ou Mesa 5"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3.5 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
        />
        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          Pode ser o nome de uma pessoa ou da mesa inteira — uma comanda de mesa pode ser
          dividida na hora de pagar.
        </p>
      </div>

      <div>
        <label
          htmlFor="numero_mesa"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
        >
          Número da mesa <span className="font-normal normal-case text-stone-400">(opcional)</span>
        </label>
        <input
          id="numero_mesa"
          name="numero_mesa"
          inputMode="numeric"
          placeholder="5"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3.5 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
        />
        <p className="mt-2 text-xs text-stone-400">Deixe em branco para clientes no balcão.</p>
      </div>

      {estado && !estado.ok ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {estado.mensagem}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="mt-auto rounded-lg bg-stone-900 px-4 py-4 font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {enviando ? "Abrindo…" : "Abrir comanda"}
      </button>
    </form>
  );
}
