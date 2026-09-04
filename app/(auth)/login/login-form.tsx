"use client";

import { useActionState } from "react";
import { enviarMagicLink, type EstadoForm } from "@/app/actions/auth";

export function LoginForm({ erroInicial }: { erroInicial?: boolean }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(
    enviarMagicLink,
    erroInicial
      ? { ok: false, mensagem: "Esse link expirou ou já foi usado. Peça um novo." }
      : null,
  );

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="marquinho@email.com"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3.5 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
        />
      </div>

      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-stone-900 px-4 py-3.5 font-semibold text-white transition-colors hover:bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Enviar link de acesso"}
      </button>

      {estado ? (
        <p
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            estado.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {estado.mensagem}
        </p>
      ) : null}
    </form>
  );
}
