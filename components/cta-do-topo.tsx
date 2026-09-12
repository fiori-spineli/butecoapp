"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * O "Quero no meu bar" do cabeçalho da vitrine.
 *
 * A página abre com o mesmo botão em destaque logo abaixo, na chamada. Dois
 * botões iguais na mesma tela era o que o dono viu no celular: confuso. Este
 * só aparece quando o da chamada já rolou para fora da vista — aí ele é o
 * único, e é o que fica preso no topo enquanto a pessoa lê o resto.
 *
 * `alvo` é o id do botão da chamada que ele observa.
 */
/** O id do botão da chamada. Uma ponta só, para os dois lados não divergirem. */
export const ID_CTA_PRINCIPAL = "cta-principal";

export function CtaDoTopo({ alvo }: { alvo: string }) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    // O alvo é garantido: quem o renderiza é a mesma vitrine, com o id
    // exportado aqui (ID_CTA_PRINCIPAL) — não há como as duas pontas
    // divergirem sem quebrar o build. Por isso não existe caminho de
    // emergência com setState aqui dentro: o observador é a única fonte do
    // estado, e ele dispara sozinho na montagem com a situação atual.
    const botaoDaChamada = document.getElementById(alvo);
    if (!botaoDaChamada) return;

    const observador = new IntersectionObserver(
      ([entrada]) => setVisivel(!entrada.isIntersecting),
      { threshold: 0 },
    );
    observador.observe(botaoDaChamada);
    return () => observador.disconnect();
  }, [alvo]);

  return (
    <Link
      href="/contato"
      aria-hidden={!visivel}
      tabIndex={visivel ? 0 : -1}
      className={`cursor-pointer inline-flex min-h-11 items-center rounded-lg bg-amber-700 hover:bg-amber-800 px-4 text-xs font-bold text-white shadow-xs transition-all duration-200 ${
        visivel ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
      }`}
    >
      Quero no meu bar
    </Link>
  );
}
