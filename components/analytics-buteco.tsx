"use client";

import { Analytics } from "@vercel/analytics/next";

/**
 * Web Analytics com o token da comanda removido antes de sair do navegador.
 *
 * O evento de pageview carrega dois campos: `route` (o padrão, `/c/[token]`) e
 * `path` (o caminho de verdade, com o token dentro). O token É a credencial de
 * acesso do cliente à conta dele — quem tem a URL abre a comanda. Deixar isso
 * chegar num painel de métricas seria entregar acesso às contas de todos os
 * clientes a quem abrir o painel.
 *
 * O `beforeSend` roda no navegador antes do envio: trocamos o token por
 * `[token]` na URL. Continuamos sabendo quantas pessoas abrem a página do QR,
 * que é a pergunta que queríamos responder, sem saber QUAL comanda.
 */
export function AnalyticsButeco() {
  return (
    <Analytics
      beforeSend={(evento) => {
        try {
          const url = new URL(evento.url);

          if (url.pathname.startsWith("/c/")) {
            url.pathname = "/c/[token]";
            return { ...evento, url: url.toString() };
          }

          return evento;
        } catch {
          // URL que não dá para interpretar: descarta em vez de arriscar
          // mandar um caminho não tratado.
          return null;
        }
      }}
    />
  );
}
