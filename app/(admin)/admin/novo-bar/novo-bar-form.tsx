"use client";

import { useActionState, useState } from "react";
import { criarClienteManual } from "@/app/actions/clientes";
import type { EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";

export function NovoBarForm() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(
    criarClienteManual,
    null
  );

  const [nomeBar, setNomeBar] = useState("");
  const [nomeDono, setNomeDono] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [telefone, setTelefone] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Gera uma senha aleatória fácil de ditar
  function gerarSenhaAutomatica() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let gerada = "";
    for (let i = 0; i < 10; i++) {
      gerada += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSenha(gerada);
  }

  // Trata resposta de sucesso com dados prontos para o WhatsApp
  const ehSucesso = estado?.ok && estado.mensagem.startsWith("SUCESSO_");
  const partes = ehSucesso ? estado.mensagem.split("|") : [];
  const tipoSucesso = partes[0];
  const barCriado = partes[1];
  const emailCriado = partes[2];
  const credencialCriada = partes[3];

  const mensagemWhatsApp =
    tipoSucesso === "SUCESSO_SENHA"
      ? `Olá! Seu acesso ao ButecoApp para o ${barCriado} está pronto:\n\nLink: https://butecoapp.vercel.app/login\nE-mail: ${emailCriado}\nSenha: ${credencialCriada}`
      : `Olá! Seu acesso ao ButecoApp para o ${barCriado} está pronto! Clique no link abaixo para criar sua senha de acesso:\n\n${credencialCriada}`;

  async function copiarWhatsApp() {
    await navigator.clipboard.writeText(mensagemWhatsApp);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  if (ehSucesso) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 p-6 animate-in fade-in duration-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="size-3 rounded-full bg-emerald-500" />
          <h3 className="text-base font-black text-emerald-900 dark:text-emerald-300">
            Conta do {barCriado} criada com sucesso!
          </h3>
        </div>

        <p className="text-xs text-emerald-800 dark:text-emerald-400 mb-4">
          Copie a mensagem abaixo e envie para o dono do bar pelo WhatsApp:
        </p>

        <textarea
          readOnly
          value={mensagemWhatsApp}
          rows={5}
          className="w-full rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-stone-900 p-3 font-mono text-xs text-stone-800 dark:text-stone-200 outline-none"
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copiarWhatsApp}
            className="cursor-pointer min-h-11 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-5 text-xs font-bold text-white shadow-xs transition-colors"
          >
            {copiado ? "Copiado!" : "Copiar mensagem para WhatsApp"}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 text-xs font-bold text-stone-700 dark:text-stone-300"
          >
            Cadastrar outro bar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="novo-bar-bar_nome" className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
            Nome do Bar <span className="text-rose-500">*</span>
          </label>
          <input
            name="bar_nome"
            id="novo-bar-bar_nome"
            required
            maxLength={120}
            value={nomeBar}
            onChange={(e) => setNomeBar(e.target.value)}
            placeholder="Ex: Bar do Zé"
            className="w-full min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
          />
        </div>

        <div>
          <label htmlFor="novo-bar-nome_dono" className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
            Nome do Responsável
          </label>
          <input
            name="nome_dono"
            id="novo-bar-nome_dono"
            maxLength={120}
            value={nomeDono}
            onChange={(e) => setNomeDono(e.target.value)}
            placeholder="Ex: José da Silva"
            className="w-full min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="novo-bar-email" className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
            E-mail de Acesso <span className="text-rose-500">*</span>
          </label>
          <input
            name="email"
            id="novo-bar-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dono@bardoze.com"
            className="w-full min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
          />
        </div>

        <div>
          <label htmlFor="novo-bar-telefone" className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
            Telefone / WhatsApp
          </label>
          <input
            name="telefone"
            id="novo-bar-telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(11) 98765-4321"
            className="w-full min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="novo-bar-senha" className="block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
            Senha Inicial (Opcional)
          </label>
          <button
            type="button"
            onClick={gerarSenhaAutomatica}
            className="cursor-pointer text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
          >
            Gerar senha segura
          </button>
        </div>
        <input
          name="senha"
          id="novo-bar-senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Deixe em branco para gerar um link de ativação"
          className="w-full min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3.5 text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 font-mono"
        />
        <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
          Se você definir uma senha aqui, o dono poderá entrar direto no painel com ela.
        </p>
      </div>

      {estado && !estado.ok && (
        <p className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-bold text-rose-900 dark:text-rose-200">
          {estado.mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="cursor-pointer mt-3 min-h-12 w-full rounded-xl bg-amber-700 hover:bg-amber-600 px-6 font-bold text-white shadow-xs transition-colors disabled:opacity-50 text-sm"
      >
        {enviando ? <LoadingButeco fraseFixa="Criando bar e usuário..." /> : "Criar Dono de Bar"}
      </button>
    </form>
  );
}