"use client";

import { useActionState, useState } from "react";
import {
  criarContaDoBar,
  mudarStatusInteressado,
} from "@/app/actions/interessados";
import type { EstadoForm } from "@/app/actions/auth";
import type { Interessado } from "@/lib/types";
import { formatarDataHora } from "@/lib/format";
import { formatarTelefone, linkWhatsApp } from "@/lib/telefone";
import { LoadingButeco } from "@/components/loading-buteco";

/**
 * A fila de bares interessados, dentro do painel de admin.
 *
 * É a contrapartida de ter fechado o cadastro público: se ninguém mais cria
 * conta sozinho, alguém precisa criar — e esse alguém precisa de uma tela onde
 * isso leve dois cliques, senão o pedido apodrece na fila.
 */

const ROTULO_STATUS: Record<Interessado["status"], { texto: string; classe: string }> = {
  novo: {
    texto: "Novo",
    classe:
      "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-900",
  },
  contatado: {
    texto: "Contatado",
    classe:
      "bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300/70 dark:border-sky-900",
  },
  convertido: {
    texto: "Conta criada",
    classe:
      "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300/70 dark:border-emerald-900",
  },
  descartado: {
    texto: "Descartado",
    classe:
      "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700",
  },
};

export function FilaInteressados({ interessados }: { interessados: Interessado[] }) {
  const [mostrarResolvidos, setMostrarResolvidos] = useState(false);

  const pendentes = interessados.filter(
    (i) => i.status === "novo" || i.status === "contatado",
  );
  const resolvidos = interessados.filter(
    (i) => i.status === "convertido" || i.status === "descartado",
  );

  const visiveis = mostrarResolvidos ? interessados : pendentes;

  return (
    <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 px-6 py-4">
        <div>
          <h2 className="text-base font-black text-stone-900 dark:text-stone-100">
            Bares interessados
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {pendentes.length === 0
              ? "Nenhum pedido esperando resposta"
              : `${pendentes.length} pedido${pendentes.length === 1 ? "" : "s"} esperando resposta`}
            {resolvidos.length > 0 && ` · ${resolvidos.length} já resolvido${resolvidos.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {resolvidos.length > 0 && (
          <button
            type="button"
            onClick={() => setMostrarResolvidos((v) => !v)}
            className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 px-4 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            {mostrarResolvidos ? "Ver só os pendentes" : "Mostrar todos"}
          </button>
        )}
      </div>

      {visiveis.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-stone-500 dark:text-stone-400">
          A fila está vazia. Pedidos feitos em <code>/contato</code> aparecem aqui.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {visiveis.map((interessado) => (
            <CartaoInteressado key={interessado.id} interessado={interessado} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CartaoInteressado({ interessado }: { interessado: Interessado }) {
  const [estadoConta, acaoConta, criandoConta] = useActionState<EstadoForm, FormData>(
    criarContaDoBar,
    null,
  );
  const [estadoStatus, acaoStatus, salvandoStatus] = useActionState<EstadoForm, FormData>(
    mudarStatusInteressado,
    null,
  );
  const [abrirCriacao, setAbrirCriacao] = useState(false);

  const rotulo = ROTULO_STATUS[interessado.status];
  const jaConvertido = interessado.status === "convertido";

  return (
    <li className="px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-stone-900 dark:text-stone-100">
              {interessado.bar_nome}
            </h3>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${rotulo.classe}`}
            >
              {rotulo.texto}
            </span>
          </div>

          <p className="mt-1 text-xs text-stone-600 dark:text-stone-300">
            {interessado.nome}
            {interessado.cidade && ` · ${interessado.cidade}`}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <a
              href={linkWhatsApp(
                interessado.telefone,
                `Olá, ${interessado.nome}! Aqui é do ButecoApp, sobre o acesso do ${interessado.bar_nome}.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer inline-flex min-h-11 items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2a10 10 0 0 0-8.6 15.06L2 22l5.07-1.33A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.08-1.12l-.29-.17-3 .79.8-2.93-.19-.3A8 8 0 1 1 12 20zm4.4-5.9c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12s-.62.78-.76.94-.28.18-.52.06a6.5 6.5 0 0 1-1.92-1.19 7.28 7.28 0 0 1-1.34-1.66c-.14-.24 0-.37.1-.49s.24-.28.36-.42a1.6 1.6 0 0 0 .24-.4.44.44 0 0 0 0-.42c0-.12-.54-1.3-.74-1.78s-.4-.4-.54-.41h-.46a.89.89 0 0 0-.64.3 2.7 2.7 0 0 0-.84 2 4.71 4.71 0 0 0 1 2.5 10.77 10.77 0 0 0 4.1 3.62c.57.25 1.02.4 1.37.51a3.3 3.3 0 0 0 1.51.1 2.47 2.47 0 0 0 1.62-1.15 2 2 0 0 0 .14-1.14c-.06-.1-.22-.16-.46-.28z" />
              </svg>
              {formatarTelefone(interessado.telefone)}
            </a>

            <a
              href={`mailto:${interessado.email}`}
              className="cursor-pointer inline-flex min-h-11 items-center font-semibold text-stone-600 dark:text-stone-300 hover:underline"
            >
              {interessado.email}
            </a>
          </div>
        </div>

        <p className="shrink-0 text-[11px] text-stone-400 dark:text-stone-500">
          {formatarDataHora(interessado.created_at)}
        </p>
      </div>

      {interessado.mensagem && (
        <p className="mt-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 p-3 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          {interessado.mensagem}
        </p>
      )}

      {interessado.observacao && (
        <p className="mt-2 text-xs italic text-stone-500 dark:text-stone-400">
          Nota: {interessado.observacao}
        </p>
      )}

      {/* Ações */}
      {!jaConvertido && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAbrirCriacao((v) => !v)}
            className="cursor-pointer min-h-11 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-4 text-xs font-bold text-white shadow-xs transition-colors"
          >
            {abrirCriacao ? "Cancelar" : "Criar conta deste bar"}
          </button>

          <form action={acaoStatus} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="interessado_id" value={interessado.id} />
            <input
              name="observacao"
              defaultValue={interessado.observacao ?? ""}
              placeholder="Nota interna (opcional)"
              maxLength={300}
              className="min-h-11 w-48 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-xs text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
            />
            <button
              type="submit"
              name="status"
              value="contatado"
              disabled={salvandoStatus}
              className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 px-4 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-60"
            >
              Marcar contatado
            </button>
            <button
              type="submit"
              name="status"
              value="descartado"
              disabled={salvandoStatus}
              className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 px-4 text-xs font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors disabled:opacity-60"
            >
              Descartar
            </button>
          </form>
        </div>
      )}

      {abrirCriacao && !jaConvertido && (
        <form
          action={acaoConta}
          className="mt-3 rounded-xl border border-amber-300/70 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 p-4"
        >
          <input type="hidden" name="interessado_id" value={interessado.id} />

          <p className="mb-3 text-xs leading-relaxed text-amber-900 dark:text-amber-300">
            Isso cria o usuário já confirmado, cria o bar e manda para o dono o link de
            definir a senha. Confira o e-mail antes: é ele que vira o login.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Nome do bar
              <input
                name="bar_nome"
                defaultValue={interessado.bar_nome}
                required
                maxLength={120}
                className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm font-normal text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
              />
            </label>

            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              E-mail de acesso
              <input
                name="email"
                type="email"
                defaultValue={interessado.email}
                required
                className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm font-normal text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={criandoConta}
            className="cursor-pointer mt-3 min-h-11 w-full rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {criandoConta ? <LoadingButeco /> : "Confirmar e criar o bar"}
          </button>
        </form>
      )}

      {(estadoConta || estadoStatus) && (
        <p
          role="status"
          className={`mt-3 rounded-xl border px-4 py-2.5 text-xs font-medium ${
            (estadoConta ?? estadoStatus)?.ok
              ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300"
              : "border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300"
          }`}
        >
          {(estadoConta ?? estadoStatus)?.mensagem}
        </p>
      )}
    </li>
  );
}
