"use client";

import { useActionState, useState } from "react";
import { salvarMensagemQr } from "@/app/actions/bar";
import type { EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";
import {
  LIMITE_DE_CARACTERES,
  MARCADORES,
  MENSAGEM_PADRAO,
  montarMensagem,
} from "@/lib/mensagem-qr";

/**
 * Onde o dono escreve o texto que vai junto do link no WhatsApp.
 *
 * A prévia embaixo mostra a mensagem já com os marcadores trocados pelos
 * valores reais do bar. Sem ela, `{bar}` é abstração — com ela, a pessoa lê
 * exatamente o que o cliente vai receber e para de precisar imaginar.
 */
export function MensagemQrForm({
  mensagemAtual,
  nomeDoBar,
}: {
  mensagemAtual: string | null;
  nomeDoBar: string;
}) {
  const [estado, acao, salvando] = useActionState<EstadoForm, FormData>(
    salvarMensagemQr,
    null,
  );
  const [texto, setTexto] = useState(mensagemAtual ?? "");

  const usandoPadrao = texto.trim().length === 0;
  const previa = montarMensagem(texto, { bar: nomeDoBar, comanda: "Mesa 7" });
  const restantes = LIMITE_DE_CARACTERES - texto.length;

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="mensagem"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
        >
          Mensagem do compartilhamento
        </label>
        <textarea
          id="mensagem"
          name="mensagem"
          rows={4}
          maxLength={LIMITE_DE_CARACTERES}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={MENSAGEM_PADRAO}
          className="w-full resize-y rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 transition-all"
        />
        <div className="mt-1.5 flex items-center justify-between gap-3">
          <span className="text-[11px] text-stone-500 dark:text-stone-400">
            Deixe em branco para usar a mensagem padrão.
          </span>
          <span
            className={`shrink-0 text-[11px] tabular-nums ${
              restantes < 30
                ? "font-bold text-amber-700 dark:text-amber-500"
                : "text-stone-400 dark:text-stone-500"
            }`}
          >
            {restantes}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 p-3.5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Atalhos que você pode usar
        </p>
        <ul className="flex flex-col gap-1.5">
          {MARCADORES.map((marcador) => (
            <li key={marcador.chave} className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTexto((atual) => `${atual}${marcador.chave}`)}
                className="cursor-pointer shrink-0 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-2 py-1 font-mono font-bold text-amber-700 dark:text-amber-500 active:scale-95 transition-transform"
              >
                {marcador.chave}
              </button>
              <span className="text-stone-600 dark:text-stone-400">
                vira o {marcador.descricao}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-3.5">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
          O cliente vai receber assim
          {usandoPadrao ? " (padrão)" : ""}
        </p>
        <p className="text-xs leading-relaxed text-emerald-950 dark:text-emerald-100 whitespace-pre-wrap break-words">
          {previa}
        </p>
        <p className="mt-1.5 text-[11px] text-emerald-700/80 dark:text-emerald-500/80">
          …seguido do link da comanda.
        </p>
      </div>

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

      <div className="flex gap-3">
        {!usandoPadrao && (
          <button
            type="button"
            onClick={() => setTexto("")}
            className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-sm font-bold text-stone-700 dark:text-stone-200 active:scale-95 transition-transform"
          >
            Voltar ao padrão
          </button>
        )}
        <button
          type="submit"
          disabled={salvando}
          className="cursor-pointer min-h-11 flex-1 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-xs active:scale-95 transition-transform disabled:opacity-60"
        >
          {salvando ? <LoadingButeco /> : "Salvar mensagem"}
        </button>
      </div>
    </form>
  );
}
