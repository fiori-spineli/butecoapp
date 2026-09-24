"use client";

import { useActionState } from "react";
import Link from "next/link";
import { abrirLinkDeRecuperacao, type EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";

export function AbrirLinkForm({ tokenHash, code }: { tokenHash: string; code: string }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(abrirLinkDeRecuperacao, null);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="code" value={code} />

      {estado && !estado.ok && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40 px-4 py-3 text-xs leading-relaxed font-medium text-rose-950 dark:text-rose-200"
        >
          {estado.mensagem}{" "}
          <Link href="/login?modo=recuperar" className="font-bold underline">
            Pedir código novo
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="cursor-pointer min-h-12 w-full rounded-xl bg-amber-700 hover:bg-amber-600 px-6 text-sm font-bold text-white shadow-xs transition-colors disabled:opacity-60"
      >
        {enviando ? <LoadingButeco /> : "Criar minha nova senha"}
      </button>
    </form>
  );
}
