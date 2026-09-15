"use client";

import { useState, useTransition } from "react";
import { pedirTrocaDeSenha, type EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";

export function SenhaForm() {
  const [pendente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoForm>(null);

  function enviarLink() {
    setEstado(null);
    iniciar(async () => {
      setEstado(await pedirTrocaDeSenha());
    });
  }

  return (
    /* w-full sem max-w-md para preencher toda a extensão do card */
    <div className="flex flex-col gap-4 w-full">
      <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">
        Por segurança, a senha é cadastrada pelo link que enviamos para o e-mail da
        sua conta. Assim ninguém troca a sua senha só por estar com o seu celular
        na mão.
      </p>

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

      {/* Botão em largura total com o mesmo padrão e padding de 'Salvar alterações' */}
      <button
        type="button"
        onClick={enviarLink}
        disabled={pendente}
        className="cursor-pointer w-full min-h-11 rounded-xl bg-amber-700 hover:bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-xs transition-transform active:scale-95 disabled:opacity-60"
      >
        {pendente ? <LoadingButeco /> : "Receber link para cadastrar senha"}
      </button>
    </div>
  );
}