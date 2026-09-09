"use client";

import { useActionState, useState } from "react";
import {
  enviarMagicLink,
  entrarComSenha,
  cadastrarComSenha,
  redefinirSenha,
  type EstadoForm,
} from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";

const MENSAGEM_ERRO: Record<string, string> = {
  expirado:
    "Esse link já foi usado ou expirou. Peça um novo — e se o seu e-mail abre links automaticamente, ele pode estar gastando o link antes de você.",
  navegador:
    "Abra o link no mesmo navegador em que você pediu — é lá que fica a chave que destrava a entrada.",
  link: "Não consegui validar esse link. Peça um novo.",
};

type ModoAcesso = "link" | "senha" | "cadastro" | "recuperar";

export function LoginForm({ erroInicial }: { erroInicial?: string }) {
  const [modo, setModo] = useState<ModoAcesso>("link");
  const [lembrar, setLembrar] = useState(true);

  const [estadoLink, acaoLink, enviandoLink] = useActionState<EstadoForm, FormData>(
    enviarMagicLink,
    erroInicial
      ? { ok: false, mensagem: MENSAGEM_ERRO[erroInicial] ?? MENSAGEM_ERRO.link }
      : null,
  );

  const [estadoSenha, acaoSenha, enviandoSenha] = useActionState<EstadoForm, FormData>(
    entrarComSenha,
    null,
  );

  const [estadoCadastro, acaoCadastro, enviandoCadastro] = useActionState<EstadoForm, FormData>(
    cadastrarComSenha,
    null,
  );

  const [estadoRecuperar, acaoRecuperar, enviandoRecuperar] = useActionState<EstadoForm, FormData>(
    redefinirSenha,
    null,
  );

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Alternador de Método */}
      {modo !== "recuperar" && (
        <div className="flex rounded-xl bg-stone-200/80 dark:bg-stone-800 p-1.5 border border-stone-300 dark:border-stone-700">
          <button
            type="button"
            onClick={() => setModo("link")}
            className={`cursor-pointer flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              modo === "link"
                ? "bg-amber-800 text-amber-50 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Link no e-mail
          </button>
          <button
            type="button"
            onClick={() => setModo("senha")}
            className={`cursor-pointer flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              modo === "senha" || modo === "cadastro"
                ? "bg-amber-800 text-amber-50 shadow-sm"
                : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            E-mail e senha
          </button>
        </div>
      )}

      {/* 1. MODO: LINK MÁGICO */}
      {modo === "link" && (
        <form action={acaoLink} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email-link"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400"
            >
              E-mail do dono
            </label>
            <input
              id="email-link"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="dono@buteco.com"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900/90 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-amber-700 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-700/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoLink}
            className="cursor-pointer w-full rounded-xl bg-linear-to-b from-stone-900 to-stone-950 dark:from-amber-700 dark:to-amber-800 px-4 py-4 font-bold text-white shadow-md shadow-stone-900/20 dark:shadow-amber-950/40 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition-all"
          >
            {enviandoLink ? <LoadingButeco /> : "Receber link de acesso"}
          </button>

          <div className="rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 p-3.5 flex items-start gap-3 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
            <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p>
              <strong>Atenção:</strong> O e-mail com o link pode cair na sua pasta de{" "}
              <strong className="underline decoration-amber-700 dark:decoration-amber-500 underline-offset-2">Spam</strong> ou{" "}
              <strong className="underline decoration-amber-700 dark:decoration-amber-500 underline-offset-2">Lixo eletrônico</strong>. Verifique lá caso não chegue em instantes.
            </p>
          </div>

          {estadoLink && (
            <Alerta ok={estadoLink.ok} mensagem={estadoLink.mensagem} />
          )}
        </form>
      )}

      {/* 2. MODO: ENTRAR COM SENHA */}
      {modo === "senha" && (
        <form action={acaoSenha} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email-senha"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400"
            >
              E-mail
            </label>
            <input
              id="email-senha"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="dono@buteco.com"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900/90 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-amber-700 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-700/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password-login"
                className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400"
              >
                Senha
              </label>
              <button
                type="button"
                onClick={() => setModo("recuperar")}
                className="cursor-pointer text-xs font-medium text-amber-800 dark:text-amber-400 hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
            <input
              id="password-login"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900/90 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-amber-700 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-700/20 transition-all"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <label className="cursor-pointer flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 select-none">
              <input
                type="checkbox"
                name="lembrar"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                className="cursor-pointer size-4 rounded border-stone-300 text-amber-700 focus:ring-amber-700 accent-amber-700"
              />
              <span>Manter conectado (renovação semanal)</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={enviandoSenha}
            className="cursor-pointer w-full rounded-xl bg-linear-to-b from-stone-900 to-stone-950 dark:from-amber-700 dark:to-amber-800 px-4 py-4 font-bold text-white shadow-md shadow-stone-900/20 dark:shadow-amber-950/40 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition-all"
          >
            {enviandoSenha ? <LoadingButeco /> : "Entrar no bar"}
          </button>

          {estadoSenha && (
            <Alerta ok={estadoSenha.ok} mensagem={estadoSenha.mensagem} />
          )}

          <div className="pt-2 text-center border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setModo("cadastro")}
              className="cursor-pointer text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline"
            >
              Novo por aqui? Cadastrar bar e criar senha
            </button>
          </div>
        </form>
      )}

      {/* 3. MODO: CADASTRO */}
      {modo === "cadastro" && (
        <form action={acaoCadastro} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email-cadastro"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400"
            >
              E-mail do bar
            </label>
            <input
              id="email-cadastro"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="dono@buteco.com"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900/90 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-amber-700 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-700/20 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="senha-cadastro"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400"
            >
              Criar senha (mínimo 6 caracteres)
            </label>
            <input
              id="senha-cadastro"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900/90 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-amber-700 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-700/20 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-senha"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400"
            >
              Confirmar senha
            </label>
            <input
              id="confirm-senha"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900/90 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-amber-700 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-700/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoCadastro}
            className="cursor-pointer w-full rounded-xl bg-linear-to-b from-stone-900 to-stone-950 dark:from-amber-700 dark:to-amber-800 px-4 py-4 font-bold text-white shadow-md shadow-stone-900/20 dark:shadow-amber-950/40 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition-all"
          >
            {enviandoCadastro ? <LoadingButeco /> : "Cadastrar meu bar"}
          </button>

          {estadoCadastro && (
            <Alerta ok={estadoCadastro.ok} mensagem={estadoCadastro.mensagem} />
          )}

          <div className="pt-2 text-center border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setModo("senha")}
              className="cursor-pointer text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline"
            >
              Já possui conta? Fazer login
            </button>
          </div>
        </form>
      )}

      {/* 4. MODO: RECUPERAR SENHA */}
      {modo === "recuperar" && (
        <form action={acaoRecuperar} className="flex flex-col gap-4">
          <div>
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400 mb-3">
              Digite seu e-mail cadastrado para enviarmos um link de redefinição de senha.
            </p>
            <label
              htmlFor="email-recuperar"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400"
            >
              E-mail cadastrado
            </label>
            <input
              id="email-recuperar"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="dono@buteco.com"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900/90 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:border-amber-700 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-700/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoRecuperar}
            className="cursor-pointer w-full rounded-xl bg-linear-to-b from-stone-900 to-stone-950 dark:from-amber-700 dark:to-amber-800 px-4 py-4 font-bold text-white shadow-md shadow-stone-900/20 dark:shadow-amber-950/40 hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition-all"
          >
            {enviandoRecuperar ? <LoadingButeco /> : "Enviar link de recuperação"}
          </button>

          {estadoRecuperar && (
            <Alerta ok={estadoRecuperar.ok} mensagem={estadoRecuperar.mensagem} />
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setModo("senha")}
              className="cursor-pointer text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline"
            >
              Voltar ao login
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Alerta({ ok, mensagem }: { ok: boolean; mensagem: string }) {
  return (
    <p
      role="status"
      className={`rounded-xl border px-4 py-3 text-xs leading-relaxed font-medium ${
        ok
          ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
      }`}
    >
      {mensagem}
    </p>
  );
}