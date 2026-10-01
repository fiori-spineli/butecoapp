"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import {
  confirmarCodigoDeRecuperacao,
  pedirCodigoDeRecuperacao,
  pedirTrocaDeSenha,
  type EstadoForm,
  type EstadoRecuperacao,
} from "@/app/actions/auth";
import { mascararEmail } from "@/lib/mascarar-email";
import { CampoTurnstile } from "@/components/turnstile";
import { LoadingButeco } from "@/components/loading-buteco";

/**
 * "Esqueci a senha" do jeito que banco e loja grande fazem.
 *
 * 1. E-mail (com CAPTCHA) → a resposta é a mesma exista a conta ou não.
 * 2. Código de 8 números que chega no e-mail → vale em qualquer aparelho, uma
 *    vez só, por 1 hora. O link do mesmo e-mail é o caminho alternativo.
 * 3. O servidor leva a pessoa para /nova-senha — nunca direto para o painel.
 *
 * O mesmo componente serve o Perfil (`modo="perfil"`): lá o e-mail é o da
 * sessão e não pode ser trocado, e a action que pede o código ignora o campo.
 */

const CLASSE_CAMPO =
  "w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/60 px-4 py-3 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-700 dark:focus:border-amber-500 focus:bg-white dark:focus:bg-stone-800 transition-all text-sm";

const CLASSE_ROTULO =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300";

const CLASSE_BOTAO =
  "cursor-pointer w-full min-h-12 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-4 py-3.5 font-bold text-white shadow-xs transition-all disabled:opacity-60 text-sm";

const ESPERA_PARA_REENVIAR = 60;

function Alerta({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40 px-4 py-3 text-xs leading-relaxed font-medium text-rose-950 dark:text-rose-200"
    >
      {children}
    </p>
  );
}

/**
 * Espera antes de liberar o "reenviar".
 *
 * O Auth recusa um segundo pedido no mesmo minuto; o botão fica desligado pelo
 * mesmo tempo para a pessoa não ouvir um "não" que não entende. Cada pedido
 * aceito chega com um `enviadoEm` novo, usado como `key` pelo pai — o React
 * monta um cronômetro novo, sem copiar resultado de action para estado.
 */
function Cronometro({ segundos, children }: { segundos: number; children: ReactNode }) {
  const [restante, setRestante] = useState(segundos);
  const acabou = restante <= 0;

  // Um intervalo só, do começo ao fim da espera — e nenhum depois dela.
  useEffect(() => {
    if (acabou) return;
    const relogio = setInterval(() => setRestante((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(relogio);
  }, [acabou]);

  if (restante > 0) {
    return (
      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        Não chegou? Você pode pedir outro código em {restante}s.
      </p>
    );
  }
  return <>{children}</>;
}

export function RecuperarSenha({
  modo,
  emailInicial = "",
  aoVoltar,
}: {
  modo: "login" | "perfil";
  emailInicial?: string;
  aoVoltar?: () => void;
}) {
  const emailFixo = modo === "perfil";
  const [email, setEmail] = useState(emailInicial);
  // Qual resposta de "código enviado" a pessoa dispensou ao tocar em "usar
  // outro e-mail". A etapa é derivada da resposta, não copiada para estado.
  const [descartado, setDescartado] = useState<unknown>(null);

  const [estadoPedido, acaoPedido, pedindo] = useActionState<EstadoRecuperacao, FormData>(
    emailFixo ? pedirTrocaDeSenha : pedirCodigoDeRecuperacao,
    null,
  );
  // O reenvio tem estado próprio: se ele falhar (CAPTCHA, limite), o erro
  // aparece aqui mesmo, e a pessoa não é jogada de volta para o passo 1.
  const [estadoReenvio, acaoReenvio, reenviando] = useActionState<EstadoRecuperacao, FormData>(
    emailFixo ? pedirTrocaDeSenha : pedirCodigoDeRecuperacao,
    null,
  );
  const [estadoCodigo, acaoCodigo, conferindo] = useActionState<EstadoForm, FormData>(
    confirmarCodigoDeRecuperacao,
    null,
  );

  const etapa = estadoPedido?.ok && estadoPedido !== descartado ? "codigo" : "email";
  const ultimoEnvio = Math.max(
    estadoPedido?.ok ? (estadoPedido.enviadoEm ?? 0) : 0,
    estadoReenvio?.ok ? (estadoReenvio.enviadoEm ?? 0) : 0,
  );

  if (etapa === "email") {
    return (
      <form action={acaoPedido} className="flex w-full flex-col gap-4">
        <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
          {emailFixo
            ? "Para trocar a senha, vamos mandar um código para o e-mail da sua conta. Assim ninguém troca a sua senha só por estar com o seu celular na mão."
            : "Informe o e-mail da sua conta. Vamos mandar um código de 8 números para você criar uma senha nova."}
        </p>

        {emailFixo ? (
          <p className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/60 px-4 py-3 text-sm font-semibold">
            {mascararEmail(email)}
          </p>
        ) : (
          <div>
            <label htmlFor="email-recuperar" className={CLASSE_ROTULO}>
              E-mail da conta
            </label>
            <input
              id="email-recuperar"
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@buteco.com"
              className={CLASSE_CAMPO}
            />
          </div>
        )}

        <CampoTurnstile acao="recuperar-senha" renovarQuando={estadoPedido} />

        {estadoPedido && !estadoPedido.ok && <Alerta>{estadoPedido.mensagem}</Alerta>}

        <button type="submit" disabled={pedindo} className={CLASSE_BOTAO}>
          {pedindo ? <LoadingButeco /> : "Enviar código por e-mail"}
        </button>

        {aoVoltar && (
          <div className="pt-3 text-center border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={aoVoltar}
              className="cursor-pointer min-h-11 px-3 text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline"
            >
              Voltar ao login
            </button>
          </div>
        )}
      </form>
    );
  }

  const emailNormalizado = email.trim().toLowerCase();

  return (
    <div className="flex w-full flex-col gap-4">
      <p
        role="status"
        className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/80 dark:bg-emerald-950/20 p-3 text-xs leading-relaxed text-emerald-900 dark:text-emerald-300"
      >
        {estadoPedido?.mensagem}{" "}
        <span className="font-bold">Enviado para {mascararEmail(emailNormalizado)}.</span> Confira
        também o Spam e a aba Promoções.
      </p>

      <form action={acaoCodigo} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={emailNormalizado} />
        <div>
          <label htmlFor="codigo-recuperar" className={CLASSE_ROTULO}>
            Código do e-mail
          </label>
          <input
            id="codigo-recuperar"
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            autoFocus
            maxLength={16}
            placeholder="12345678"
            aria-describedby="codigo-ajuda"
            className={`${CLASSE_CAMPO} text-center font-mono text-lg tracking-[0.3em]`}
          />
          <p id="codigo-ajuda" className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
            Vale por 1 hora e uma vez só. Se pedir de novo, só o código mais novo funciona.
          </p>
        </div>

        {estadoCodigo && !estadoCodigo.ok && <Alerta>{estadoCodigo.mensagem}</Alerta>}

        <button type="submit" disabled={conferindo} className={CLASSE_BOTAO}>
          {conferindo ? <LoadingButeco /> : "Confirmar código"}
        </button>
      </form>

      {estadoReenvio?.ok && estadoReenvio.enviadoEm === ultimoEnvio && (
        <p role="status" className="text-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          Código novo enviado. Use só o mais recente.
        </p>
      )}
      {estadoReenvio && !estadoReenvio.ok && <Alerta>{estadoReenvio.mensagem}</Alerta>}

      <Cronometro key={ultimoEnvio} segundos={ESPERA_PARA_REENVIAR}>
        <form action={acaoReenvio} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={emailNormalizado} />
          <CampoTurnstile acao="recuperar-senha" renovarQuando={estadoReenvio} />
          <button
            type="submit"
            disabled={reenviando}
            className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:opacity-60"
          >
            {reenviando ? <LoadingButeco /> : "Reenviar código"}
          </button>
        </form>
      </Cronometro>

      {(!emailFixo || aoVoltar) && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 pt-3 border-t border-stone-200 dark:border-stone-800">
          {!emailFixo && (
            <button
              type="button"
              onClick={() => setDescartado(estadoPedido)}
              className="cursor-pointer min-h-11 px-2 text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline"
            >
              Usar outro e-mail
            </button>
          )}
          {aoVoltar && (
            <button
              type="button"
              onClick={aoVoltar}
              className="cursor-pointer min-h-11 px-2 text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline"
            >
              Voltar ao login
            </button>
          )}
        </div>
      )}
    </div>
  );
}
