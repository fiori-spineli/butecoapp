"use client";

import { useActionState } from "react";
import { criarComanda } from "@/app/actions/comandas";
import type { EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";

export function NovaComandaForm() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(criarComanda, null);

  return (
    <form action={acao} className="flex flex-1 flex-col gap-6 px-6 py-8 max-w-lg mx-auto w-full">
      <div>
        <label
          htmlFor="nome"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
        >
          Nome da comanda ou cliente
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoFocus
          placeholder="Ex: Zé, ou Mesa 5"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
        />
        <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
          Pode ser o nome de uma pessoa ou da mesa inteira (comandas de mesa podem ser divididas na hora do acerto).
        </p>
      </div>

      <div>
        <label
          htmlFor="numero_mesa"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
        >
          Número da mesa <span className="font-normal normal-case text-stone-400">(opcional)</span>
        </label>
        <input
          id="numero_mesa"
          name="numero_mesa"
          inputMode="numeric"
          placeholder="Ex: 5"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
        />
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Deixe em branco se o cliente estiver consumindo no balcão.</p>
      </div>

      {estado && !estado.ok ? (
        <p role="alert" className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-900 dark:text-rose-200">
          {estado.mensagem}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="cursor-pointer mt-auto w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-4 font-bold text-white shadow-xs transition-colors disabled:opacity-60"
      >
        {enviando ? <LoadingButeco /> : "Abrir comanda"}
      </button>
    </form>
  );
}