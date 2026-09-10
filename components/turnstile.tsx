"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Widget do Cloudflare Turnstile.
 *
 * Ele mesmo injeta no formulário o campo `cf-turnstile-response` com o token —
 * por isso este componente não renderiza input nenhum. O estado local existe
 * só para a tela poder dizer se a verificação passou.
 *
 * A chave do site é pública por definição (vive no HTML de qualquer página com
 * CAPTCHA); quem valida é o segredo, que fica no servidor. Ver lib/turnstile.ts.
 */

type OpcoesRender = {
  sitekey: string;
  action?: string;
  theme?: "auto" | "light" | "dark";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (elemento: HTMLElement, opcoes: OpcoesRender) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const CHAVE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Uma carga só por aba, mesmo com dois widgets na mesma página. */
let carregando: Promise<void> | null = null;

function carregarScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  carregando ??= new Promise<void>((resolver, rejeitar) => {
    const tag = document.createElement("script");
    tag.src = SCRIPT;
    tag.async = true;
    tag.defer = true;
    tag.onload = () => resolver();
    tag.onerror = () => {
      carregando = null;
      rejeitar(new Error("Turnstile não carregou"));
    };
    document.head.appendChild(tag);
  });

  return carregando;
}

export function CampoTurnstile({
  acao,
  /**
   * O token é de uso único: depois de uma tentativa recusada, o que está no
   * formulário já não vale. Passe aqui o estado de resposta da action — quando
   * ele muda, o widget se renova sozinho e o próximo envio não falha por um
   * motivo que a pessoa não tem como adivinhar.
   */
  renovarQuando,
}: {
  acao?: string;
  renovarQuando?: unknown;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);
  const [situacao, setSituacao] = useState<"carregando" | "pronto" | "falhou">("carregando");

  useEffect(() => {
    if (!CHAVE) return;

    let cancelado = false;

    carregarScript()
      .then(() => {
        if (cancelado || !caixa.current || !window.turnstile) return;

        idWidget.current = window.turnstile.render(caixa.current, {
          sitekey: CHAVE,
          action: acao,
          theme: "auto",
          callback: () => setSituacao("pronto"),
          "expired-callback": () => setSituacao("carregando"),
          "error-callback": () => setSituacao("falhou"),
        });
      })
      .catch(() => {
        if (!cancelado) setSituacao("falhou");
      });

    return () => {
      cancelado = true;
      if (idWidget.current && window.turnstile) {
        window.turnstile.remove(idWidget.current);
        idWidget.current = null;
      }
    };
  }, [acao]);

  useEffect(() => {
    if (!renovarQuando || !idWidget.current || !window.turnstile) return;
    window.turnstile.reset(idWidget.current);
    setSituacao("carregando");
  }, [renovarQuando]);

  // Sem chave configurada o campo simplesmente não existe — é o que deixa o
  // `next dev` rodar sem conta na Cloudflare.
  if (!CHAVE) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={caixa} className="min-h-[65px]" />
      {situacao === "falhou" && (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          A verificação de segurança não carregou. Confira a conexão e recarregue a página.
        </p>
      )}
    </div>
  );
}
