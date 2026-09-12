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
 * `router.refresh()` refaz só a parte servidora da rota e reconcilia: o estado
 * do cliente (modal aberto, texto digitado, rolagem) sobrevive. Por isso ele,
 * e não `location.reload()`, que jogaria fora o que a pessoa estava fazendo.
 *
 * A cadência é a mesma da comanda do cliente, e pelo mesmo motivo: nada roda
 * com a aba escondida (outro app, tela apagada), e ao voltar a busca é
 * imediata em vez de esperar o próximo tique. Aba em segundo plano não gasta
 * rede nem servidor.
 */
export function AtualizacaoAoVivo({ intervaloMs = 5000 }: { intervaloMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let ativo = true;

    function agendar() {
      if (!ativo) return;
      timer = setTimeout(() => {
        if (!document.hidden) router.refresh();
        agendar();
      }, intervaloMs);
    }

    function aoVoltar() {
      if (document.hidden) return;
      clearTimeout(timer);
      router.refresh();
      agendar();
    }

    agendar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    window.addEventListener("pageshow", aoVoltar);
    window.addEventListener("online", aoVoltar);

    return () => {
      ativo = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("pageshow", aoVoltar);
      window.removeEventListener("online", aoVoltar);
    };
  }, [router, intervaloMs]);

  return null;
}
