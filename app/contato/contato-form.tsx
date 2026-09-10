"use client";

import { useActionState, useState } from "react";
import { registrarInteresse, type EstadoInteresse } from "@/app/actions/interesse";
import { CAMPO_ARMADILHA, ESTILO_ARMADILHA } from "@/lib/armadilha";
import { apenasDigitos } from "@/lib/telefone";
import { LoadingButeco } from "@/components/loading-buteco";
import { CampoTurnstile } from "@/components/turnstile";

const CLASSE_CAMPO =
  "w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 px-4 py-3 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-700 dark:focus:border-amber-500 focus:bg-white dark:focus:bg-stone-800 transition-all text-sm";

const CLASSE_ROTULO =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300";

/** Vai formatando enquanto digita — (11) 91234-5678. */
function mascararTelefone(entrada: string): string {
  const d = apenasDigitos(entrada).slice(0, 11);

  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function ContatoForm() {
  const [estado, acao, enviando] = useActionState<EstadoInteresse, FormData>(
    registrarInteresse,
    null,
  );
  /*
   * Todos os campos são controlados, e não é preferência de estilo.
   *
   * O React 19 LIMPA o formulário sozinho quando a action termina — inclusive
   * quando ela termina em erro. Testado: errar o telefone apagava nome, bar e
   * e-mail já digitados, e a pessoa recomeçava do zero por causa de um dígito.
   * Com o valor no estado, o que foi digitado fica onde está.
   */
  const [campos, setCampos] = useState({
    nome: "",
    bar_nome: "",
    telefone: "",
    email: "",
    cidade: "",
    mensagem: "",
  });

  function mudar(campo: keyof typeof campos, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  // Deu certo: o formulário sai da tela. Deixá-lo ali convida a mandar de novo
  // — e a segunda vez cai na regra de duplicado, o que parece erro.
  if (estado?.ok) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/20 p-8 text-center"
      >
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-200">
          Pedido enviado
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900/80 dark:text-emerald-300/90">
          {estado.mensagem}
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      {/*
        Armadilha. Fica no DOM, fora da tela, fora do Tab e fora do leitor de
        tela — quem preenche isto não tem olhos nem dedos. Ver lib/armadilha.ts.
      */}
      <div style={ESTILO_ARMADILHA} aria-hidden="true">
        <label htmlFor={CAMPO_ARMADILHA}>Não preencha este campo</label>
        <input
          id={CAMPO_ARMADILHA}
          name={CAMPO_ARMADILHA}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nome" className={CLASSE_ROTULO}>
            Seu nome
          </label>
          <input
            id="nome"
            name="nome"
            required
            maxLength={120}
            autoComplete="name"
            value={campos.nome}
            onChange={(e) => mudar("nome", e.target.value)}
            placeholder="Como podemos te chamar"
            className={CLASSE_CAMPO}
          />
        </div>

        <div>
          <label htmlFor="bar_nome" className={CLASSE_ROTULO}>
            Nome do bar
          </label>
          <input
            id="bar_nome"
            name="bar_nome"
            required
            maxLength={120}
            value={campos.bar_nome}
            onChange={(e) => mudar("bar_nome", e.target.value)}
            placeholder="Ex: Buteco do Samuel"
            className={CLASSE_CAMPO}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="telefone" className={CLASSE_ROTULO}>
            Telefone com DDD
          </label>
          <input
            id="telefone"
            name="telefone"
            required
            inputMode="tel"
            autoComplete="tel"
            value={campos.telefone}
            onChange={(e) => mudar("telefone", mascararTelefone(e.target.value))}
            placeholder="(11) 91234-5678"
            className={CLASSE_CAMPO}
          />
          <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
            É por aqui que a gente costuma resolver mais rápido.
          </p>
        </div>

        <div>
          <label htmlFor="email" className={CLASSE_ROTULO}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            value={campos.email}
            onChange={(e) => mudar("email", e.target.value)}
            placeholder="voce@seubar.com"
            className={CLASSE_CAMPO}
          />
          <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
            Será o login do bar quando a conta estiver pronta.
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="cidade" className={CLASSE_ROTULO}>
          Cidade <span className="font-normal normal-case text-stone-400">(opcional)</span>
        </label>
        <input
          id="cidade"
          name="cidade"
          maxLength={120}
          autoComplete="address-level2"
          value={campos.cidade}
          onChange={(e) => mudar("cidade", e.target.value)}
          placeholder="Ex: Santo André, SP"
          className={CLASSE_CAMPO}
        />
      </div>

      <div>
        <label htmlFor="mensagem" className={CLASSE_ROTULO}>
          Conte um pouco do seu bar{" "}
          <span className="font-normal normal-case text-stone-400">(opcional)</span>
        </label>
        <textarea
          id="mensagem"
          name="mensagem"
          rows={4}
          maxLength={2000}
          value={campos.mensagem}
          onChange={(e) => mudar("mensagem", e.target.value)}
          placeholder="Quantas mesas, quantas pessoas atendem, o que hoje mais dá trabalho na hora de fechar a conta..."
          className={`${CLASSE_CAMPO} resize-y`}
        />
      </div>

      <CampoTurnstile acao="interesse" renovarQuando={estado} />

      <button
        type="submit"
        disabled={enviando}
        className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-4 font-bold text-white shadow-xs transition-all disabled:opacity-60 text-sm"
      >
        {enviando ? <LoadingButeco /> : "Enviar pedido"}
      </button>

      {estado && !estado.ok && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/20 px-4 py-3 text-xs leading-relaxed font-medium text-rose-900 dark:text-rose-300"
        >
          {estado.mensagem}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        Usamos esses dados só para falar com você sobre o ButecoApp. Nada de lista de
        e-mail, nada repassado para terceiros.
      </p>
    </form>
  );
}
