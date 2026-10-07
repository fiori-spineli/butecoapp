"use client";

import { useEffect, type RefObject } from "react";

const FOCAVEIS = [
  "a[href]", "button:not([disabled])", "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])", "textarea:not([disabled])", "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Foco de um diálogo modal, do jeito que teclado e leitor de tela esperam:
 *
 * - ao abrir, o foco entra no diálogo (respeitando um `autoFocus` que já esteja lá);
 * - Tab e Shift+Tab giram só entre os controles do diálogo — antes o Tab saía
 *   para a página de fundo, que continuava clicável por teclado;
 * - ao fechar, o foco volta para quem abriu o diálogo.
 */
export function useFocoPreso(container: RefObject<HTMLElement | null>, ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    const anterior = document.activeElement as HTMLElement | null;
    const raiz = container.current;
    if (raiz && !raiz.contains(document.activeElement)) {
      (raiz.querySelector<HTMLElement>(FOCAVEIS) ?? raiz).focus();
    }

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Tab" || !container.current) return;
      const itens = [...container.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (itens.length === 0) { evento.preventDefault(); return; }
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      const atual = document.activeElement;
      if (evento.shiftKey && (atual === primeiro || !container.current.contains(atual))) {
        evento.preventDefault(); ultimo.focus();
      } else if (!evento.shiftKey && (atual === ultimo || !container.current.contains(atual))) {
        evento.preventDefault(); primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, [ativo, container]);
}
