"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { assinarSincronia } from "@/lib/sincronia-ao-vivo";

/**
 * Liga a tela ao batimento de `lib/sincronia-ao-vivo.ts`: quando o bar muda em
 * outro aparelho, refaz os dados desta tela.
 *
 * É `router.refresh()` e nunca `location.reload()` — o primeiro troca só a
 * parte servidora e preserva modal aberto, texto digitado e rolagem; o segundo
 * joga fora o que a pessoa estava fazendo no meio do movimento (GUARDRAILS §9).
 *
 * Este componente não tem relógio nenhum, e é essa a diferença que importa: ele
 * monta e desmonta à vontade (fica no layout do painel, mas o React pode
 * remontá-lo numa transição) sem que isso interrompa a sincronia. Quando o loop
 * morava aqui dentro, uma desmontagem sem remontagem calava o app até o F5 —
 * ver o histórico do incidente em lib/sincronia-ao-vivo.ts.
 */
export function AtualizacaoAoVivo() {
  const router = useRouter();

  useEffect(() => assinarSincronia(() => router.refresh()), [router]);

  return null;
}
