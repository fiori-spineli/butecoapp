"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  entrarComGoogle,
  entrarComSenha,
  redefinirSenha,
  type EstadoForm,
} from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";
import { CampoTurnstile } from "@/components/turnstile";

const MENSAGEM_ERRO: Record<string, string> = {
  expirado:
    "Esse link já foi usado ou expirou. Peça um novo — se seu e-mail faz varredura automática, ele pode ter consumido o link antes de você.",
  navegador:
    "Termine o login no mesmo navegador em que você começou — a verificação fica guardada nele.",
  google:
    "O login com Google ainda não está habilitado no servidor. Entre com e-mail e senha por enquanto.",
  link: "Não consegui validar esse link. Peça um novo.",
};

type ModoAcesso = "senha" | "recuperar";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 px-4 py-3 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-700 dark:focus:border-amber-500 focus:bg-white dark:focus:bg-stone-800 transition-all text-sm";

const CLASSE_ROTULO =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300";

export function LoginForm({
  erroInicial,
  /** Ver lib/provedores.ts: o botão só existe se o provider estiver ligado. */
  mostrarGoogle = false,
}: {
  erroInicial?: string;
  mostrarGoogle?: boolean;
}) {
  const [modo, setModo] = useState<ModoAcesso>("senha");
  const [lembrar, setLembrar] = useState(true);
  /*
   * O e-mail é controlado porque o React 19 limpa o formulário quando a action
   * termina — inclusive quando ela termina em "senha incorreta". Digitar o
   * endereço de novo a cada tentativa, em teclado de celular, é castigo por
   * errar a senha. A senha em si continua sendo apagada, e aí de propósito.
   */
  const [email, setEmail] = useState("");

  const [estadoSenha, acaoSenha, enviandoSenha] = useActionState<EstadoForm, FormData>(
    entrarComSenha,
    erroInicial
      ? { ok: false, mensagem: MENSAGEM_ERRO[erroInicial] ?? MENSAGEM_ERRO.link }
      : null,
  );

  const [estadoGoogle, acaoGoogle, enviandoGoogle] = useActionState<EstadoForm, FormData>(
    entrarComGoogle,
    null,
  );

  const [estadoRecuperar, acaoRecuperar, enviandoRecuperar] = useActionState<EstadoForm, FormData>(
    redefinirSenha,
    null,
  );

  if (modo === "recuperar") {
    return (
      <form action={acaoRecuperar} className="flex w-full flex-col gap-4">
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          Informe o e-mail cadastrado para enviarmos as instruções de redefinição de senha.
        </p>

        <div>
          <label htmlFor="email-recuperar" className={CLASSE_ROTULO}>
            E-mail cadastrado
          </label>
          <input
            id="email-recuperar"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemplo@buteco.com"
            className={CLASSE_CAMPO}
          />
        </div>

        <CampoTurnstile acao="recuperar-senha" renovarQuando={estadoRecuperar} />

        <button
          type="submit"
          disabled={enviandoRecuperar}
          className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-3.5 font-bold text-white shadow-xs transition-all disabled:opacity-60 text-sm"
        >
          {enviandoRecuperar ? <LoadingButeco /> : "Enviar link de recuperação"}
        </button>

        {estadoRecuperar && (
          <Alerta ok={estadoRecuperar.ok} mensagem={estadoRecuperar.mensagem} />
        )}

        <div className="pt-3 text-center border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={() => setModo("senha")}
            className="cursor-pointer min-h-11 px-3 text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Google primeiro: é um toque, sem digitar senha em teclado de celular
          no meio do movimento do bar. */}
      {mostrarGoogle && (
      <form action={acaoGoogle}>
        <input type="hidden" name="lembrar" value={lembrar ? "on" : ""} />
        <button
          type="submit"
          disabled={enviandoGoogle}
          className="cursor-pointer w-full rounded-xl border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 px-4 py-3.5 font-bold text-sm text-stone-800 dark:text-stone-100 shadow-xs transition-colors hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-60 flex items-center justify-center gap-3"
        >
          {enviandoGoogle ? (
            <LoadingButeco />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              Entrar com Google
            </>
          )}
        </button>
        {estadoGoogle && !estadoGoogle.ok && (
          <div className="mt-3">
            <Alerta ok={false} mensagem={estadoGoogle.mensagem} />
          </div>
        )}
      </form>
      )}

      {mostrarGoogle && (
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400">
            ou com e-mail
          </span>
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
        </div>
      )}

      <form action={acaoSenha} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email-senha" className={CLASSE_ROTULO}>
            E-mail
          </label>
          <input
            id="email-senha"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemplo@buteco.com"
            className={CLASSE_CAMPO}
          />
        </div>

        <div>
          <label htmlFor="password-login" className={CLASSE_ROTULO}>
            Senha
          </label>
          <input
            id="password-login"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={CLASSE_CAMPO}
          />
          <div className="mt-1.5 text-right">
            <button
              type="button"
              onClick={() => setModo("recuperar")}
              className="cursor-pointer min-h-11 px-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>

        <label className="cursor-pointer flex items-center gap-2.5 text-xs font-medium text-stone-600 dark:text-stone-400 select-none">
          <input
            type="checkbox"
            name="lembrar"
            checked={lembrar}
            onChange={(e) => setLembrar(e.target.checked)}
            className="cursor-pointer size-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600 accent-amber-700"
          />
          <span>Manter conectado neste aparelho</span>
        </label>

        <CampoTurnstile acao="login" renovarQuando={estadoSenha} />

        <button
          type="submit"
          disabled={enviandoSenha}
          className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-3.5 font-bold text-white shadow-xs transition-all disabled:opacity-60 text-sm"
        >
          {enviandoSenha ? <LoadingButeco /> : "Entrar no bar"}
        </button>

        {estadoSenha && <Alerta ok={estadoSenha.ok} mensagem={estadoSenha.mensagem} />}
      </form>

      {/* Não existe mais "criar conta" aqui. Quem chega sem cadastro fala com a
          gente, e a conta nasce no nosso painel — é essa porta fechada que
          impede um robô de abrir mil bares numa madrugada. */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/40 p-4 text-center">
        <p className="text-xs text-stone-600 dark:text-stone-400">
          Ainda não tem conta? A gente cria pra você.
        </p>
        <Link
          href="/contato"
          className="mt-2 inline-flex min-h-11 items-center justify-center px-3 text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline"
        >
          Quero o ButecoApp no meu bar →
        </Link>
      </div>
    </div>
  );
}

function Alerta({ ok, mensagem }: { ok: boolean; mensagem: string }) {
  return (
    <p
      role="status"
      className={`rounded-xl border px-4 py-3 text-xs leading-relaxed font-medium ${
        ok
          ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300"
          : "border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300"
      }`}
    >
      {mensagem}
    </p>
  );
}
