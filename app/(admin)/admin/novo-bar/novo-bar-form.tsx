"use client";

import { useActionState, useState } from "react";
import { criarClienteManual } from "@/app/actions/clientes";
import type { EstadoForm } from "@/app/actions/auth";

export function NovoBarForm() {
  const [state, action, pending] = useActionState<EstadoForm, FormData>(criarClienteManual, null);
  const [copied, setCopied] = useState(false);
  const link = state?.ok ? state.mensagem.match(/https?:\/\/\S+/)?.[0] : null;
  return <form action={action} className="space-y-5">
    <label className="block text-sm font-semibold">Nome do bar
      <input name="bar_nome" required minLength={2} maxLength={120}
        className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 dark:border-stone-700 dark:bg-stone-800" />
    </label>
    <label className="block text-sm font-semibold">E-mail do responsável
      <input name="email" type="email" required
        className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 dark:border-stone-700 dark:bg-stone-800" />
    </label>
    <p className="text-xs text-stone-500">O dono define a senha pelo convite de uso único, válido por 24 horas.</p>
    {state && <p role="status" className={`break-all text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.mensagem}</p>}
    {link && <button type="button" className="min-h-11 rounded-xl border px-4 text-sm" onClick={async () => {
      await navigator.clipboard.writeText(link); setCopied(true);
    }}>{copied ? "Convite copiado" : "Copiar convite"}</button>}
    <button type="submit" disabled={pending}
      className="min-h-12 w-full rounded-xl bg-amber-700 px-6 font-bold text-white disabled:opacity-50">
      {pending ? "Criando..." : "Criar bar"}
    </button>
  </form>;
}
