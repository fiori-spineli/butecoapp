import type { CSSProperties } from "react";

interface BolhaConfig {
  left: string;
  size: string;
  duration: string;
  delay: string;
  drift: string;
  opacity: number;
}

// 26 bolhas com posições e tempos pré-calculados (sem mismatch de hidratação no Next.js)
const BOLHAS: BolhaConfig[] = [
  { left: "8%", size: "4px", duration: "6.2s", delay: "-1.5s", drift: "12px", opacity: 0.65 },
  { left: "15%", size: "7px", duration: "7.8s", delay: "-4.2s", drift: "-16px", opacity: 0.8 },
  { left: "22%", size: "3px", duration: "5.5s", delay: "-0.8s", drift: "8px", opacity: 0.5 },
  { left: "29%", size: "6px", duration: "6.9s", delay: "-3.1s", drift: "-10px", opacity: 0.75 },
  { left: "34%", size: "8px", duration: "8.4s", delay: "-5.6s", drift: "18px", opacity: 0.85 },
  { left: "41%", size: "4px", duration: "5.8s", delay: "-2.3s", drift: "-8px", opacity: 0.6 },
  { left: "48%", size: "5px", duration: "7.1s", delay: "-6.0s", drift: "14px", opacity: 0.7 },
  { left: "53%", size: "9px", duration: "8.9s", delay: "-3.7s", drift: "-20px", opacity: 0.9 },
  { left: "59%", size: "3px", duration: "5.2s", delay: "-1.1s", drift: "10px", opacity: 0.55 },
  { left: "66%", size: "6px", duration: "6.7s", delay: "-4.8s", drift: "-14px", opacity: 0.75 },
  { left: "72%", size: "4px", duration: "6.0s", delay: "-2.9s", drift: "12px", opacity: 0.65 },
  { left: "78%", size: "8px", duration: "8.1s", delay: "-5.1s", drift: "-18px", opacity: 0.85 },
  { left: "85%", size: "5px", duration: "7.4s", delay: "-0.4s", drift: "15px", opacity: 0.7 },
  { left: "92%", size: "7px", duration: "7.6s", delay: "-3.9s", drift: "-12px", opacity: 0.8 },
  { left: "12%", size: "5px", duration: "6.5s", delay: "-5.8s", drift: "10px", opacity: 0.7 },
  { left: "26%", size: "8px", duration: "8.6s", delay: "-2.0s", drift: "-15px", opacity: 0.85 },
  { left: "38%", size: "3px", duration: "5.4s", delay: "-4.5s", drift: "6px", opacity: 0.5 },
  { left: "62%", size: "7px", duration: "7.9s", delay: "-1.8s", drift: "-16px", opacity: 0.8 },
  { left: "81%", size: "4px", duration: "6.3s", delay: "-6.3s", drift: "11px", opacity: 0.65 },
  { left: "95%", size: "6px", duration: "7.0s", delay: "-2.7s", drift: "-9px", opacity: 0.75 },
];

export function FundoChopp() {
  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-stone-950"
      aria-hidden="true"
    >
      {/* 1. Gradiente Base do Líquido: do dourado/âmbar central até as bordas escuras */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 75% at 50% 35%, #78350f 0%, #451a03 55%, #0c0a09 100%)",
        }}
      />

      {/* 2. Feixe de Luz Quente da Cerveja (luz dourada atravessando o copo) */}
      <div
        className="absolute inset-0 opacity-45"
        style={{
          background:
            "radial-gradient(circle at 35% 25%, #d97706 0%, rgba(217, 119, 6, 0.2) 40%, transparent 75%)",
        }}
      />

      {/* 3. Espuma cremosa no topo com transição suave */}
      <div
        className="absolute inset-x-0 top-0 h-24 opacity-35"
        style={{
          background:
            "linear-gradient(to bottom, rgba(254, 243, 199, 0.75) 0%, rgba(253, 230, 138, 0.25) 45%, transparent 100%)",
        }}
      />

      {/* 4. Reflexo sutil do vidro na lateral */}
      <div
        className="absolute top-0 left-1/4 w-32 h-full -skew-x-12 opacity-10"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)",
        }}
      />

      {/* 5. Bolhas de Carbonatação Suaves e Eficientes (Zero Lag) */}
      <div className="absolute inset-0">
        {BOLHAS.map((bolha, index) => {
          const style: CSSProperties = {
            left: bolha.left,
            width: bolha.size,
            height: bolha.size,
            animationDuration: bolha.duration,
            animationDelay: bolha.delay,
            ["--drift" as string]: bolha.drift,
            ["--max-opacity" as string]: bolha.opacity,
          };

          return <span key={index} className="bolha-chopp" style={style} />;
        })}
      </div>

      {/* 6. Vinheta escura inferior para dar contraste perfeito aos textos e botões */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(12, 10, 9, 0.85) 0%, rgba(12, 10, 9, 0.2) 40%, transparent 100%)",
        }}
      />
    </div>
  );
}