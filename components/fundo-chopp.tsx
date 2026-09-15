import type { CSSProperties } from "react";

type BubbleStyle = CSSProperties & {
  "--bubble-left": string;
  "--bubble-size": string;
  "--bubble-opacity": string;
  "--bubble-duration": string;
  "--bubble-delay": string;
  "--bubble-drift-1": string;
  "--bubble-drift-2": string;
  "--bubble-drift-3": string;
  "--bubble-drift-4": string;
  "--bubble-drift-5": string;
  "--bubble-drift-6": string;
  "--bubble-scale": string;
};

function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Cria bolhas otimizadas para alta performance em qualquer dispositivo,
 * mantendo o efeito visual fluido e imersivo.
 */
function createBubbles(count: number): BubbleStyle[] {
  return Array.from({ length: count }, (_, index) => {
    const r1 = seededRandom(index * 17 + 1);
    const r2 = seededRandom(index * 31 + 7);
    const r3 = seededRandom(index * 43 + 13);
    const r4 = seededRandom(index * 59 + 19);
    const r5 = seededRandom(index * 71 + 29);
    const r6 = seededRandom(index * 83 + 37);
    const r7 = seededRandom(index * 97 + 47);
    const r8 = seededRandom(index * 113 + 61);

    const left = 4 + r1 * 92;
    
    // Tamanhos balanceados para leveza e estética
    const size = r2 < 0.6 ? 2 + r3 * 3 : 5 + r3 * 4;
    const opacity = 0.15 + r4 * 0.65;
    const duration = 6 + r5 * 7; // Entre 6s e 13s para suavidade
    const delay = -(r6 * duration);

    const driftIntensity = 4 + r7 * 16;
    const direction = r8 > 0.5 ? 1 : -1;

    const drift1 = direction * (2 + r1 * driftIntensity);
    const drift2 = -direction * (2 + r2 * driftIntensity);
    const drift3 = direction * (3 + r3 * driftIntensity);
    const drift4 = -direction * (2 + r4 * driftIntensity);
    const drift5 = direction * (2 + r5 * driftIntensity);
    const drift6 = -direction * (1 + r6 * driftIntensity);

    return {
      "--bubble-left": `${left.toFixed(2)}%`,
      "--bubble-size": `${size.toFixed(2)}px`,
      "--bubble-opacity": opacity.toFixed(2),
      "--bubble-duration": `${duration.toFixed(2)}s`,
      "--bubble-delay": `${delay.toFixed(2)}s`,
      "--bubble-drift-1": `${drift1.toFixed(1)}px`,
      "--bubble-drift-2": `${drift2.toFixed(1)}px`,
      "--bubble-drift-3": `${drift3.toFixed(1)}px`,
      "--bubble-drift-4": `${drift4.toFixed(1)}px`,
      "--bubble-drift-5": `${drift5.toFixed(1)}px`,
      "--bubble-drift-6": `${drift6.toFixed(1)}px`,
      "--bubble-scale": (0.7 + r7 * 0.5).toFixed(2),

      left: "var(--bubble-left)",
      bottom: "-10px",
      width: "var(--bubble-size)",
      height: "var(--bubble-size)",
      opacity: "var(--bubble-opacity)",
      animationDuration: "var(--bubble-duration)",
      animationDelay: "var(--bubble-delay)",
    };
  });
}

// Reduzido para 22 bolhas altamente otimizadas (zero lag em celulares antigos e desktop)
const bubbles = createBubbles(22);

export function FundoChopp() {
  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-linear-to-b from-amber-700 via-amber-950 to-stone-950"
      aria-hidden="true"
    >
      {/* Vinheta */}
      <div className="absolute inset-0 z-10 shadow-[inset_0_0_90px_rgba(0,0,0,0.65)]" />

      {/* Espuma Superior */}
      <div className="absolute inset-x-0 top-0 z-0 h-32 bg-linear-to-b from-amber-100/40 via-amber-200/15 to-transparent blur-lg animate-espuma" />

      {/* Brilho da Espuma */}
      <div className="absolute top-6 left-1/2 z-0 h-3 w-[60%] -translate-x-1/2 rounded-full bg-white/10 blur-md animate-brilho-espuma" />

      {/* Luz Interna do Chopp */}
      <div className="absolute top-[25%] left-[20%] size-96 rounded-full bg-amber-400/20 blur-[80px] mix-blend-screen animate-luz-chopp" />

      {/* Reflexos do Copo */}
      <div className="absolute top-0 left-1/4 z-1 h-full w-32 skew-x-12 bg-linear-to-r from-transparent via-white/6 to-transparent blur-md animate-reflexo" />
      <div className="absolute top-0 right-1/3 z-1 h-full w-24 -skew-x-12 bg-linear-to-r from-transparent via-amber-200/10 to-transparent blur-lg animate-reflexo-2" />

      {/* Bolhas Otimizadas */}
      <div className="absolute inset-0 z-2">
        {bubbles.map((style, index) => (
          <span
            key={index}
            className="bolha-randomica absolute rounded-full bg-amber-50"
            style={style}
          />
        ))}
      </div>

      {/* Vinheta Final */}
      <div className="absolute inset-0 z-20 bg-linear-to-t from-black/20 via-transparent to-white/5" />
    </div>
  );
}