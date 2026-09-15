"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Intervalo em MINUTOS: 2 minutos ativo, 5 minutos ocioso
const INTERVALO_ATIVO_MS = 2 * 60 * 1000;  // 2 minutos (120.000 ms)
const INTERVALO_OCIOSO_MS = 5 * 60 * 1000; // 5 minutos (300.000 ms)
const OCIOSO_APOS_MS = 3 * 60 * 1000;      // Considera ocioso após 3 min sem mexer

export function AtualizacaoAoVivo() {
  const router = useRouter();
  const consultandoRef = useRef(false);
  const assinaturaRef = useRef<string | null>(null);
  const ultimaInteracaoRef = useRef(Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ativo = true;

    const marcarInteracao = () => {
      ultimaInteracaoRef.current = Date.now();
    };

    function obterIntervalo() {
      const ocioso = Date.now() - ultimaInteracaoRef.current > OCIOSO_APOS_MS;
      return ocioso ? INTERVALO_OCIOSO_MS : INTERVALO_ATIVO_MS;
    }

    async function conferir() {
      // Não faz requisição se a aba estiver em segundo plano ou minimizada
      if (document.hidden || consultandoRef.current) return;

      consultandoRef.current = true;
      try {
        const resposta = await fetch("/api/bar/atividade", {
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        });

        if (!resposta.ok) return;

        const { assinatura: nova } = (await resposta.json()) as { assinatura: string };

        // Só atualiza a tela se os dados do bar realmente mudaram no banco
        if (assinaturaRef.current !== null && nova !== assinaturaRef.current) {
          router.refresh();
        }
        assinaturaRef.current = nova;
      } catch {
        // Silencia falhas passageiras de rede
      } finally {
        consultandoRef.current = false;
      }
    }

    function agendar() {
      if (!ativo) return;
      timer = setTimeout(async () => {
        await conferir();
        agendar();
      }, obterIntervalo());
    }

    // Registra a assinatura inicial e agenda para daqui a 2 minutos
    conferir().then(agendar);

    // Se o usuário alternar de janela e voltar para o ButecoApp, confere uma única vez
    function aoVoltar() {
      if (document.hidden) return;
      marcarInteracao();
      conferir();
    }

    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);

    const opcoes = { passive: true, capture: true } as const;
    window.addEventListener("pointerdown", marcarInteracao, opcoes);
    window.addEventListener("keydown", marcarInteracao, opcoes);

    return () => {
      ativo = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("pointerdown", marcarInteracao);
      window.removeEventListener("keydown", marcarInteracao);
    };
  }, [router]);

  return null;
}