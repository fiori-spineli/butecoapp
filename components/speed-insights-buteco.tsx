"use client";

import { usePathname } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Speed Insights sem credencial na URL.
 *
 * O beacon de vitals manda o endereço da página (`url`). Na comanda do cliente
 * esse endereço carrega o token — e quem tem o token abre a conta. Medido em
 * produção em 2026-09: o `route` vinha agrupado (`/c/[token]`), mas o endereço
 * ia cru.
 *
 * Duas camadas, porque cada uma cobre um buraco da outra:
 *
 * 1. `beforeSend` (existe no SDK desde a 2.x; um comentário antigo aqui dizia o
 *    contrário) limpa o token e a query de recuperação ANTES do envio. Vale
 *    também para um script já carregado numa página anterior, que continua
 *    vivo durante a navegação interna — devolver `null` não o remove.
 * 2. Nas próprias rotas sensíveis o componente nem monta: abertas direto pelo
 *    QR ou pelo convite, elas nunca carregam o script.
 */
function limpar<T extends { url: string }>(evento: T): T | null {
  try {
    const url = new URL(evento.url);
    if (url.pathname.startsWith("/c/")) {
      url.pathname = "/c/[token]";
      url.search = "";
    } else if (url.pathname.startsWith("/auth/") || url.pathname === "/nova-senha") {
      url.search = "";
    }
    url.hash = "";
    return { ...evento, url: url.toString() };
  } catch {
    return null;
  }
}

export function SpeedInsightsButeco() {
  const caminho = usePathname();

  if (caminho?.startsWith("/c/") || caminho?.startsWith("/auth/")) return null;

  return <SpeedInsights beforeSend={limpar} />;
}
