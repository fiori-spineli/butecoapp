"use client";

import { useActionState } from "react";
import { enviarMagicLink, type EstadoForm } from "@/app/actions/auth";

/** Cada jeito de o link falhar pede uma ação diferente de quem está entrando. */
const MENSAGEM_ERRO: Record<string, string> = {
  expirado:
    "Esse link já foi usado ou expirou. Peça um novo — e se o seu e-mail abre links automaticamente, ele pode estar gastando o link antes de você.",
  navegador:
    "Abra o link no mesmo navegador em que você pediu — é lá que fica a chave que destrava a entrada.",
  link: "Não consegui validar esse link. Peça um novo.",
};

export function LoginForm({ erroInicial }: { erroInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(
    enviarMagicLink,
    erroInicial
      ? { ok: false, mensagem: MENSAGEM_ERRO[erroInicial] ?? MENSAGEM_ERRO.link }
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
