"use client";

import { useActionState, useState } from "react";
import {
  enviarMagicLink,
  entrarComSenha,
  cadastrarComSenha,
  redefinirSenha,
  type EstadoForm,
} from "@/app/actions/auth";

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

  // Ações de formulário gerenciadas via useActionState
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
      {/* Alternador principal de abas: Link vs Senha */}
      {modo !== "recuperar" && (
        <div className="flex rounded-xl bg-stone-200/70 p-1 border border-stone-300">
          <button
            type="button"
            onClick={() => setModo("link")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              modo === "link"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            Link mágico
          </button>
          <button
            type="button"
            onClick={() => setModo("senha")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              modo === "senha" || modo === "cadastro"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
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
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
            >
              Seu e-mail
            </label>
            <input
              id="email-link"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="dono@buteco.com"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoLink}
            className="rounded-lg bg-stone-900 px-4 py-3.5 font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {enviandoLink ? "Enviando link…" : "Enviar link de acesso"}
          </button>

          {estadoLink && (
            <Alerta ok={estadoLink.ok} mensagem={estadoLink.mensagem} />
          )}
        </form>
      )}

      {/* 2. MODO: LOGIN COM SENHA */}
      {modo === "senha" && (
        <form action={acaoSenha} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email-senha"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
            >
              E-mail
            </label>
            <input
              id="email-senha"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="dono@buteco.com"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password-login"
                className="block text-xs font-medium uppercase tracking-wide text-stone-500"
              >
                Senha
              </label>
              <button
                type="button"
                onClick={() => setModo("recuperar")}
                className="text-xs text-stone-500 hover:text-stone-900 underline underline-offset-2"
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
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoSenha}
            className="rounded-lg bg-stone-900 px-4 py-3.5 font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {enviandoSenha ? "Entrando…" : "Entrar com senha"}
          </button>

          {estadoSenha && (
            <Alerta ok={estadoSenha.ok} mensagem={estadoSenha.mensagem} />
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setModo("cadastro")}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline underline-offset-4"
            >
              Não tem senha? Criar conta aqui
            </button>
          </div>
        </form>
      )}

      {/* 3. MODO: CADASTRO COM SENHA */}
      {modo === "cadastro" && (
        <form action={acaoCadastro} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email-cadastro"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
            >
              E-mail para cadastro
            </label>
            <input
              id="email-cadastro"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="dono@buteco.com"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <div>
            <label
              htmlFor="senha-cadastro"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
            >
              Crie uma senha (mínimo 6 caracteres)
            </label>
            <input
              id="senha-cadastro"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-senha"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
            >
              Confirme a senha
            </label>
            <input
              id="confirm-senha"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoCadastro}
            className="rounded-lg bg-stone-900 px-4 py-3.5 font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {enviandoCadastro ? "Criando conta…" : "Concluir cadastro"}
          </button>

          {estadoCadastro && (
            <Alerta ok={estadoCadastro.ok} mensagem={estadoCadastro.mensagem} />
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setModo("senha")}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline underline-offset-4"
            >
              Já possui conta? Entrar com senha
            </button>
          </div>
        </form>
      )}

      {/* 4. MODO: RECUPERAR SENHA */}
      {modo === "recuperar" && (
        <form action={acaoRecuperar} className="flex flex-col gap-4">
          <div>
            <p className="text-xs text-stone-500 mb-3">
              Digite seu e-mail cadastrado para enviarmos um link de redefinição.
            </p>
            <label
              htmlFor="email-recuperar"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500"
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
              className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
            />
          </div>

          <button
            type="submit"
            disabled={enviandoRecuperar}
            className="rounded-lg bg-stone-900 px-4 py-3.5 font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
          >
            {enviandoRecuperar ? "Enviando…" : "Enviar link de recuperação"}
          </button>

          {estadoRecuperar && (
            <Alerta ok={estadoRecuperar.ok} mensagem={estadoRecuperar.mensagem} />
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setModo("senha")}
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 underline underline-offset-4"
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
      className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {mensagem}
    </p>
  );
}