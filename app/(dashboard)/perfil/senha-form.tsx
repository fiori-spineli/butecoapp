"use client";

import { useState, useTransition } from "react";
import { pedirTrocaDeSenha, type EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";

/**
 * Trocar senha não acontece aqui.
 *
 * Antes esta tela gravava a senha nova direto, sem pedir a atual: bastava
 * alguém pegar o celular destravado no balcão para fixar uma senha e ficar
 * com a conta. Agora ela só dispara o link por e-mail — quem troca a senha é
 * quem tem a caixa postal, não quem tem o aparelho na mão.
 */
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
    <div className="flex flex-col gap-5 max-w-md">
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

      <button
        type="button"
        onClick={enviarLink}
        disabled={pendente}
        className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-5 py-3.5 font-bold text-white shadow-xs transition-colors disabled:opacity-60 text-sm"
      >
        {pendente ? <LoadingButeco /> : "Receber link para cadastrar senha"}
      </button>
    </div>
  );
}
