"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { salvarNovaSenha, type EstadoForm } from "@/app/actions/auth";
import { regrasDaSenha, problemaDaSenha } from "@/lib/senha";
import { LoadingButeco } from "@/components/loading-buteco";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 pr-12 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 transition-all text-sm font-semibold";

const CLASSE_ROTULO =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300";

function Marca({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
        ok
          ? "bg-emerald-600 text-white"
          : "border border-stone-300 dark:border-stone-600 text-transparent"
      }`}
    >
      ✓
    </span>
  );
}

export function NovaSenhaForm({ email }: { email: string }) {
  const router = useRouter();
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(salvarNovaSenha, null);
  // Controlados: o React 19 limpa o formulário quando a action termina, e errar
  // a confirmação não pode apagar a senha que a pessoa acabou de inventar.
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [visivel, setVisivel] = useState(false);

  const regras = regrasDaSenha(senha);
  const coincidem = senha.length > 0 && senha === confirmar;
  const problema = senha ? problemaDaSenha(senha, email) : null;

  // Senha gravada: a raiz decide o destino (painel do bar ou admin). O atraso
  // é só para a pessoa ler que deu certo.
  useEffect(() => {
    if (!estado?.ok) return;
    const ir = setTimeout(() => router.replace("/"), 1200);
    return () => clearTimeout(ir);
  }, [estado, router]);

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <label htmlFor="senha" className={CLASSE_ROTULO}>
          Nova senha
        </label>
        <div className="relative">
          <input
            id="senha"
            name="senha"
            type={visivel ? "text" : "password"}
            autoComplete="new-password"
            required
            autoFocus
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-describedby="regras-senha"
            className={CLASSE_CAMPO}
          />
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? "Esconder as senhas" : "Mostrar as senhas"}
            aria-pressed={visivel}
            className="cursor-pointer absolute inset-y-0 right-0 flex w-12 items-center justify-center text-xs font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
          >
            {visivel ? "Ocultar" : "Ver"}
          </button>
        </div>
        <ul id="regras-senha" className="mt-2.5 flex flex-col gap-1.5 text-xs text-stone-600 dark:text-stone-400">
          {regras.map((regra) => (
            <li key={regra.id} className="flex items-center gap-2">
              <Marca ok={regra.ok} />
              {regra.texto}
            </li>
          ))}
        </ul>
        {problema && regras.every((r) => r.ok) && (
          <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">{problema}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmarSenha" className={CLASSE_ROTULO}>
          Repita a nova senha
        </label>
        <input
          id="confirmarSenha"
          name="confirmarSenha"
          type={visivel ? "text" : "password"}
          autoComplete="new-password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          className={CLASSE_CAMPO}
        />
        {confirmar.length > 0 && (
          <p
            className={`mt-1.5 flex items-center gap-2 text-xs ${
              coincidem ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
            }`}
          >
            <Marca ok={coincidem} />
            {coincidem ? "As duas senhas são iguais" : "As duas senhas ainda não são iguais"}
          </p>
        )}
      </div>

      {estado && (
        <p
          role={estado.ok ? "status" : "alert"}
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
        type="submit"
        disabled={enviando || estado?.ok === true || Boolean(problema) || !coincidem}
        className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-5 py-3.5 font-bold text-white shadow-xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
      >
        {enviando ? <LoadingButeco /> : "Salvar senha e entrar"}
      </button>
    </form>
  );
}
