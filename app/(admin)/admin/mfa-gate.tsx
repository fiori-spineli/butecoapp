"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  iniciarCadastroTOTP,
  confirmarCadastroTOTP,
  validarCodigoMFA,
  type StatusMFA,
} from "@/app/actions/mfa";
import { LoadingButeco } from "@/components/loading-buteco";

interface DadosCadastro {
  fatorId: string;
  qrCode: string;
  secret: string;
}

export function MfaGate({
  statusInicial,
  onSucesso,
}: {
  statusInicial: StatusMFA;
  onSucesso: () => void;
}) {
  // O status vem pronto do servidor; quem muda de fase aqui é `dadosCadastro`.
  const status = statusInicial;
  const [dadosCadastro, setDadosCadastro] = useState<DadosCadastro | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [carregando, iniciar] = useTransition();

  // Se não tem fator cadastrado, inicia o cadastro gerando o QR Code na hora
  useEffect(() => {
    if (!status.temFatorAtivo && !dadosCadastro) {
      iniciar(async () => {
        const res = await iniciarCadastroTOTP();
        if (res.ok && res.fatorId && res.qrCode && res.secret) {
          setDadosCadastro({
            fatorId: res.fatorId,
            qrCode: res.qrCode,
            secret: res.secret,
          });
        } else {
          setErro("Falha ao preparar autenticador. Verifique as configurações no Supabase.");
        }
      });
    }
  }, [status.temFatorAtivo, dadosCadastro]);

  // Função para copiar o código manual (caso a pessoa esteja no celular e não possa mirar a câmera)
  async function copiarChave() {
    if (!dadosCadastro?.secret) return;
    await navigator.clipboard.writeText(dadosCadastro.secret);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  // Validação do código digitado
  function submeterCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (codigo.length < 6) return;

    setErro(null);
    iniciar(async () => {
      if (!status.temFatorAtivo && dadosCadastro) {
        // Primeiro acesso: confirma pareamento
        const res = await confirmarCadastroTOTP(dadosCadastro.fatorId, codigo);
        if (res.ok) {
          onSucesso();
        } else {
          setErro(res.mensagem || "Código incorreto.");
        }
      } else if (status.fatorId) {
        // Acesso rotineiro: valida desafio TOTP
        const res = await validarCodigoMFA(status.fatorId, codigo);
        if (res.ok) {
          onSucesso();
        } else {
          setErro(res.mensagem || "Código inválido.");
        }
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xl">
      {/* 1. MODO: PRIMEIRO ACESSO (Configurar Google Authenticator / Chaves Apple) */}
      {!status.temFatorAtivo && dadosCadastro && (
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <path d="M12 18h.01" />
            </svg>
          </div>

          <h2 className="text-xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            Ativar Segundo Fator de Admin
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-stone-600 dark:text-stone-400">
            Escaneie o código abaixo com o aplicativo de autenticação da sua preferência (<strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong> ou <strong>Chaves do Mac/iPhone</strong>):
          </p>

          {/* QR Code SVG direto do Supabase */}
          <div className="my-5 rounded-2xl border border-stone-200 dark:border-stone-700 bg-white p-4 shadow-xs">
            <Image
              src={dadosCadastro.qrCode}
              alt="QR Code de Segurança"
              width={180}
              height={180}
              className="size-44 object-contain"
            />
          </div>

          {/* Chave de texto alternativa (caso esteja acessando pelo próprio celular) */}
          <div className="w-full rounded-xl bg-stone-100 dark:bg-stone-800/80 p-3 border border-stone-200 dark:border-stone-700 text-left mb-5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1">
              Chave manual (se não puder escanear)
            </span>
            <div className="flex items-center justify-between gap-2">
              <code className="font-mono text-xs font-bold text-amber-800 dark:text-amber-400 truncate">
                {dadosCadastro.secret}
              </code>
              <button
                type="button"
                onClick={copiarChave}
                className="cursor-pointer shrink-0 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
              >
                {copiado ? "Copiado!" : "Copiar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODO: VALIDAÇÃO DO CÓDIGO (Primeiro acesso ou rotina) */}
      <form onSubmit={submeterCodigo} className="flex flex-col gap-4">
        {status.temFatorAtivo && (
          <div className="text-center mb-2">
            <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-stone-900 dark:text-stone-100">
              Confirmação de Segurança
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Abra seu aplicativo autenticador e digite o código de 6 dígitos:
            </p>
          </div>
        )}

        <div>
          <label htmlFor="codigo-mfa" className="mb-1.5 block text-center text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Código de 6 dígitos
          </label>
          <input
            id="codigo-mfa"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className="w-full text-center text-3xl font-black tracking-[0.3em] rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 font-mono transition-all"
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-center text-xs text-rose-900 dark:text-rose-200">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando || codigo.length < 6}
          className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 py-3.5 font-bold text-white shadow-xs transition-colors disabled:opacity-50"
        >
          {carregando ? <LoadingButeco fraseFixa="Verificando chave..." /> : "Liberar painel de admin"}
        </button>
      </form>
    </div>
  );
}