"use client";

import { useActionState } from "react";
import { atualizarConfiguracoesBar } from "@/app/actions/bar";
import type { EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";
import type { Bar } from "@/lib/types";

// Os campos de horario, telefone e cidade ja fazem parte do tipo Bar
// (migrations 0017 e 0020) — redeclarar aqui so escondia o desencontro.
export function BarConfigForm({ bar }: { bar: Bar }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(
    atualizarConfiguracoesBar,
    null
  );

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nome" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Nome do Bar
        </label>
        <input
          id="nome"
          name="nome"
          defaultValue={bar.nome}
          required
          maxLength={120}
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="horario_abertura" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
            Abertura padrão
          </label>
          <input
            id="horario_abertura"
            name="horario_abertura"
            type="time"
            defaultValue={bar.horario_abertura?.slice(0, 5) ?? "18:00"}
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
          />
        </div>
        <div>
          <label htmlFor="horario_fechamento" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
            Fechamento padrão
          </label>
          <input
            id="horario_fechamento"
            name="horario_fechamento"
            type="time"
            defaultValue={bar.horario_fechamento?.slice(0, 5) ?? "03:00"}
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="telefone" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
            Telefone / WhatsApp <span className="font-normal text-stone-400">(opcional)</span>
          </label>
          <input
            id="telefone"
            name="telefone"
            defaultValue={bar.telefone ?? ""}
            placeholder="(11) 98765-4321"
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
          />
        </div>
        <div>
          <label htmlFor="cidade" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
            Cidade <span className="font-normal text-stone-400">(opcional)</span>
          </label>
          <input
            id="cidade"
            name="cidade"
            defaultValue={bar.cidade ?? ""}
            placeholder="Ex: São Paulo, SP"
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
          />
        </div>
      </div>

      {estado && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-medium ${
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
        className="cursor-pointer min-h-11 rounded-xl bg-amber-700 hover:bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-xs transition-transform active:scale-95 disabled:opacity-60"
      >
        {enviando ? <LoadingButeco /> : "Salvar alterações do bar"}
      </button>
    </form>
  );
}