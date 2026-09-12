"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Mantém a tela do dono em dia com o que foi feito em OUTRO aparelho.
 *
 * O bar usa dois: o celular no salão e o computador no caixa, na mesma conta.
 * Um produto cadastrado no celular, ou uma comanda aberta no caixa, só
 * apareciam do outro lado com F5 — e no meio do movimento ninguém recarrega
 * página, simplesmente acredita que o app está errado.
 *
 * COMO: pergunta a assinatura do bar (/api/bar/atividade, 32 caracteres) e só
 * chama `router.refresh()` quando ela MUDA. Perguntar é barato, então dá para
 * perguntar quase o tempo todo; recarregar é caro, então só acontece quando há
 * o que mostrar. A versão anterior fazia o contrário — recarregava a rota
 * inteira a cada 5 s, tivesse mudado algo ou não.
 *
 * `router.refresh()` refaz só a parte servidora e reconcilia: modal aberto,
 * texto digitado e rolagem sobrevivem. Por isso ele, e não `location.reload()`.
 *
 * CADÊNCIA (o Page Visibility API do MDN pede pausa explícita, não confiar no
 * throttling do navegador):
 *   - aba à vista e alguém mexendo: 1,5 s — o mais perto de imediato que dá
 *     sem transformar cada aba numa enxurrada de requisições;
 *   - aba à vista e parada há mais de um minuto: 6 s, porque ninguém está
 *     olhando de perto;
 *   - aba escondida: NADA. Sem timer, sem rede, sem bateria;
 *   - ao voltar para a aba: pergunta na hora, sem esperar o próximo ciclo;
 *   - erro de rede: espera o dobro a cada falha, até 30 s, e volta ao normal
 *     assim que uma resposta chega.
 */

const INTERVALO_ATIVO_MS = 1500;
const INTERVALO_OCIOSO_MS = 6000;
const INTERVALO_MAXIMO_MS = 30000;
/** Sem toque, clique ou tecla por este tempo, a tela conta como ociosa. */
const OCIOSO_APOS_MS = 60000;

export function AtualizacaoAoVivo() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ativo = true;
    let falhas = 0;
    let assinatura: string | null = null;
    let ultimaInteracao = Date.now();

    const marcarInteracao = () => {
      ultimaInteracao = Date.now();
    };

    function proximoIntervalo() {
      if (falhas > 0) {
        return Math.min(INTERVALO_ATIVO_MS * 2 ** falhas, INTERVALO_MAXIMO_MS);
      }
      const ocioso = Date.now() - ultimaInteracao > OCIOSO_APOS_MS;
      return ocioso ? INTERVALO_OCIOSO_MS : INTERVALO_ATIVO_MS;
    }

    async function conferir() {
      if (document.hidden) return;

      try {
        const resposta = await fetch("/api/bar/atividade", { cache: "no-store" });
        if (!resposta.ok) throw new Error(String(resposta.status));

        const { assinatura: nova } = (await resposta.json()) as { assinatura: string };
        falhas = 0;

        // A primeira resposta só estabelece a referência: a tela acabou de ser
        // renderizada pelo servidor, já está em dia.
        if (assinatura !== null && nova !== assinatura) router.refresh();
        assinatura = nova;
      } catch {
        falhas += 1;
      }
    }

    function agendar() {
      if (!ativo) return;
      timer = setTimeout(async () => {
        await conferir();
        agendar();
      }, proximoIntervalo());
    }

    function aoVoltar() {
      if (document.hidden) return;
      clearTimeout(timer);
      falhas = 0;
      marcarInteracao();
      void conferir().then(agendar);
    }

    agendar();

    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    window.addEventListener("pageshow", aoVoltar);
    window.addEventListener("online", aoVoltar);

    // `passive` e `capture`: só observar, sem atrapalhar rolagem nem clique.
    const opcoes = { passive: true, capture: true } as const;
    for (const evento of ["pointerdown", "keydown", "wheel", "touchstart"] as const) {
      window.addEventListener(evento, marcarInteracao, opcoes);
    }

    return () => {
      ativo = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("pageshow", aoVoltar);
      window.removeEventListener("online", aoVoltar);
      for (const evento of ["pointerdown", "keydown", "wheel", "touchstart"] as const) {
        window.removeEventListener(evento, marcarInteracao, opcoes);
      }
    };
  }, [router]);

  return null;
}
