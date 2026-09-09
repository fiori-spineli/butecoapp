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
    "Esse link já foi usado ou expirou. Peça um novo — se seu e-mail faz varredura automática, ele pode ter consumido o link antes de você.",
  navegador:
    "Abra o link no mesmo navegador em que você pediu — a sessão fica gravada nele.",
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
    <div className="w-full flex flex-col gap-6">
      {/* Abas Alternadoras: Link vs Senha */}
      {modo !== "recuperar" && (
        <div className="grid grid-cols-2 rounded-xl bg-stone-100 dark:bg-stone-800/70 p-1 border border-stone-200 dark:border-stone-700/60">
          <button
            type="button"
            onClick={() => setModo("link")}
            className={`cursor-pointer py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              modo === "link"
                ? "bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-400 shadow-sm border border-stone-200/60 dark:border-stone-700"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
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
            className={`cursor-pointer py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
              modo === "senha" || modo === "cadastro"
                ? "bg-white dark:bg-stone-900 text-amber-900 dark:text-amber-400 shadow-sm border border-stone-200/60 dark:border-stone-700"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
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
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
            >
              E-mail do bar
            </label>
            <input
              id="email-link"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="exemplo@buteco.com"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoLink}
            className="cursor-pointer w-full rounded-xl bg-amber-800 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-3.5 font-bold text-white shadow-sm transition-all disabled:opacity-60"
          >
            {enviandoLink ? <LoadingButeco /> : "Receber link de acesso"}
          </button>

          {/* Aviso sobre SPAM */}
          <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start gap-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>
              <strong>Fique atento:</strong> O e-mail com o link pode ir para a pasta de{" "}
              <strong className="underline decoration-amber-600 underline-offset-2">Spam</strong> ou{" "}
              <strong className="underline decoration-amber-600 underline-offset-2">Lixo eletrônico</strong>. Caso não chegue na entrada em 1 minuto, cheque lá.
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
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
            >
              E-mail
            </label>
            <input
              id="email-senha"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="exemplo@buteco.com"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password-login"
                className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
              >
                Senha
              </label>
              <button
                type="button"
                onClick={() => setModo("recuperar")}
                className="cursor-pointer text-xs font-semibold text-amber-800 dark:text-amber-400 hover:underline"
              >
                Esqueceu?
              </button>
            </div>
            <input
              id="password-login"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
            />
          </div>

          <div className="flex items-center justify-between py-0.5">
            <label className="cursor-pointer flex items-center gap-2.5 text-xs font-medium text-stone-600 dark:text-stone-400 select-none">
              <input
                type="checkbox"
                name="lembrar"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                className="cursor-pointer size-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600 accent-amber-700"
              />
              <span>Lembrar meu acesso neste aparelho</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={enviandoSenha}
            className="cursor-pointer w-full rounded-xl bg-amber-800 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-3.5 font-bold text-white shadow-sm transition-all disabled:opacity-60"
          >
            {enviandoSenha ? <LoadingButeco /> : "Entrar no bar"}
          </button>

          {estadoSenha && (
            <Alerta ok={estadoSenha.ok} mensagem={estadoSenha.mensagem} />
          )}

          <div className="pt-3 text-center border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setModo("cadastro")}
              className="cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-400 hover:underline"
            >
              Não tem conta? Cadastrar bar e criar senha
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
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
            >
              E-mail do dono
            </label>
            <input
              id="email-cadastro"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="exemplo@buteco.com"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="senha-cadastro"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
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
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-senha"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
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
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoCadastro}
            className="cursor-pointer w-full rounded-xl bg-amber-800 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-3.5 font-bold text-white shadow-sm transition-all disabled:opacity-60"
          >
            {enviandoCadastro ? <LoadingButeco /> : "Cadastrar meu bar"}
          </button>

          {estadoCadastro && (
            <Alerta ok={estadoCadastro.ok} mensagem={estadoCadastro.mensagem} />
          )}

          <div className="pt-3 text-center border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setModo("senha")}
              className="cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-400 hover:underline"
            >
              Já tem conta? Fazer login
            </button>
          </div>
        </form>
      )}

      {/* 4. MODO: RECUPERAR SENHA */}
      {modo === "recuperar" && (
        <form action={acaoRecuperar} className="flex flex-col gap-4">
          <div>
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400 mb-3">
              Informe seu e-mail cadastrado para enviarmos as instruções de redefinição de senha.
            </p>
            <label
              htmlFor="email-recuperar"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300"
            >
              E-mail cadastrado
            </label>
            <input
              id="email-recuperar"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="exemplo@buteco.com"
              className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoRecuperar}
            className="cursor-pointer w-full rounded-xl bg-amber-800 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-3.5 font-bold text-white shadow-sm transition-all disabled:opacity-60"
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
              className="cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-400 hover:underline"
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