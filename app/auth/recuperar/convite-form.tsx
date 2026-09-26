"use client";

import { useActionState } from "react";
import { confirmarCodigoDeRecuperacao, type EstadoForm } from "@/app/actions/auth";

export function ConviteForm({ email, token }: { email: string; token: string }) {
  const [state, action, pending] = useActionState<EstadoForm, FormData>(confirmarCodigoDeRecuperacao, null);
  return <form action={action} className="mt-6 space-y-4">
    <input type="hidden" name="email" value={email} />
    <input type="hidden" name="codigo" value={token} />
    {state && !state.ok && <p role="alert" className="text-sm text-rose-700">{state.mensagem}</p>}
    <button type="submit" disabled={pending}
      className="min-h-12 w-full rounded-xl bg-amber-700 px-6 font-bold text-white disabled:opacity-50">
      {pending ? "Validando..." : "Continuar e criar senha"}
    </button>
  </form>;
}
