"use client";

import { usePathname } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Speed Insights em todo lugar, menos na página da comanda do cliente.
 *
 * Achei isso medindo o corpo da requisição em produção, não lendo documentação:
 * o beacon de vitals manda DOIS campos de endereço.
 *
 *   "route": "/c/[token]"
 *   "href":  "https://butecoapp.vercel.app/c/0716d5a1-1a85-42cb-8e94-18c063468665"
 *
 * O `route` vem agrupado, mas o `href` vai cru — com o token de verdade. E esse
 * token É a credencial de acesso do cliente: quem tem a URL abre a comanda.
 * Diferente do @vercel/analytics, este SDK não expõe `beforeSend`, então não há
 * como limpar o campo antes do envio.
 *
 * Sobra não medir essa rota. Custa pouco: a página do cliente já carrega em
 * ~600 ms, e a lentidão que queremos investigar está na área do dono — que
 * continua medida normalmente.
 */
export function SpeedInsightsButeco() {
  const caminho = usePathname();

  if (caminho?.startsWith("/c/")) return null;

  return <SpeedInsights />;
}
