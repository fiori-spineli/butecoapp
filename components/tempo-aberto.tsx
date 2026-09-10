"use client";

import { useEffect, useRef, useState } from "react";
import { descreverDuracao, intervaloDeAtualizacao } from "@/lib/tempo";

/**
 * Quanto tempo a comanda está aberta, contando na tela.
 *
 * O relógio só começa depois que o componente monta, e não no servidor. Não é
 * capricho: o HTML do servidor carrega o "agora" dele, o navegador tem o
 * "agora" próprio, e os dois nunca batem no segundo — o React reclamaria de
 * hidratação em toda comanda da lista. O traço que aparece por um instante é o
 * preço disso, e ele ocupa a mesma largura do texto final para a linha não
 * pular quando o número chega.
 *
 * O intervalo do tique acompanha a idade da comanda: de segundo em segundo na
 * primeira hora, e cada vez mais espaçado depois. Trinta cartões piscando a
 * cada segundo é bateria do celular do dono indo embora à toa.
 */
export function TempoAberto({
  desde,
  className = "",
}: {
  desde: string;
  className?: string;
}) {
  const [agora, setAgora] = useState<number | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const inicio = Date.parse(desde);
    if (Number.isNaN(inicio)) return;

    function agendar() {
      setAgora(Date.now());
      timer.current = window.setTimeout(
        agendar,
        intervaloDeAtualizacao(Date.now() - inicio),
      );
    }

    agendar();

    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [desde]);

  const inicio = Date.parse(desde);
  const texto =
    agora === null || Number.isNaN(inicio) ? "—" : descreverDuracao(agora - inicio);

  return (
    <span className={`tabular-nums ${className}`} suppressHydrationWarning>
      {texto}
    </span>
  );
}
