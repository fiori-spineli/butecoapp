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
  "--bubble-scale": string;
  "--bubble-blur": string;
  "--bubble-glow": string;
};

/**
 * Gerador pseudoaleatório determinístico.
 *
 * Diferente de Math.random(), os valores não mudam
 * a cada renderização do componente.
 */
function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Cria uma distribuição natural de bolhas.
 *
 * Cada bolha recebe:
 * - posição própria
 * - tamanho
 * - opacidade
 * - duração
 * - atraso
 * - 4 pontos diferentes de deslocamento horizontal
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

    // Distribuição horizontal.
    // Pequena variação evita agrupamentos perfeitos.
    const left = 3 + r1 * 94;

    // Mistura de bolhas pequenas, médias e grandes.
    let size: number;

    if (r2 < 0.55) {
      size = 1 + r3 * 2.5;
    } else if (r2 < 0.88) {
      size = 2.5 + r3 * 3.5;
    } else {
      size = 5 + r3 * 4.5;
    }

    // Opacidades bem variadas.
    const opacity = 0.12 + r4 * 0.72;

    // Velocidade individual.
    const duration = 5.5 + r5 * 9;

    // Delay individual.
    const delay = -(r6 * 14);

    /**
     * Trajetória horizontal.
     *
     * Cada ponto é diferente, produzindo algo parecido com:
     *
     *       /
     *     /
     *      \
     *       \
     *         /
     *
     * em vez de todas subirem em linha reta.
     */
    const driftBase = 8 + r7 * 22;

    const drift1 =
      (r1 > 0.5 ? 1 : -1) * (4 + r2 * driftBase);

    const drift2 =
      (r2 > 0.5 ? -1 : 1) * (5 + r3 * driftBase);

    const drift3 =
      (r3 > 0.5 ? 1 : -1) * (4 + r4 * driftBase);

    const drift4 =
      (r4 > 0.5 ? -1 : 1) * (3 + r5 * driftBase);

    // Bolhas maiores recebem um pequeno brilho.
    const glow =
      size >= 5
        ? Math.round(4 + r6 * 8)
        : size >= 3
          ? Math.round(2 + r6 * 5)
          : 0;

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
      "--bubble-scale": (0.75 + r7 * 0.7).toFixed(2),
      "--bubble-blur":
        size < 2.5 ? "0.35px" : size < 4 ? "0.15px" : "0px",
      "--bubble-glow": `${glow}px`,
      left: "var(--bubble-left)",
      bottom: "-8px",
      width: "var(--bubble-size)",
      height: "var(--bubble-size)",
      opacity: "var(--bubble-opacity)",
      animationDuration: "var(--bubble-duration)",
      animationDelay: "var(--bubble-delay)",
      filter: "blur(var(--bubble-blur))",
    };
  });
}

// Geradas uma única vez.
// Não são recriadas a cada renderização.
const bubbles = createBubbles(42);

export function FundoChopp() {
  return (
    <div
      className="
        absolute inset-0 z-0
        overflow-hidden
        pointer-events-none
        bg-linear-to-b
        from-amber-700
        via-amber-950
        to-stone-950
      "
      aria-hidden="true"
    >
      {/* =========================================================
          1. VINHETA / VIDRO
         ========================================================= */}

      <div
        className="
          absolute inset-0 z-10
          shadow-[inset_0_0_110px_rgba(0,0,0,0.72)]
        "
      />

      {/* =========================================================
          2. ESPUMA
         ========================================================= */}

      <div
        className="
          absolute inset-x-0 top-0 z-0 h-36
          bg-linear-to-b
          from-amber-100/45
          via-amber-200/20
          to-transparent
          blur-xl
          animate-espuma
        "
      />

      <div
        className="
          absolute -top-10 left-[2%] z-0
          h-28 w-[108%]
          rounded-[100%]
          bg-amber-50/30
          blur-2xl
        "
      />

      <div
        className="
          absolute top-7 left-1/2 z-0
          h-4 w-[70%]
          -translate-x-1/2
          rounded-full
          bg-white/10
          blur-xl
          animate-brilho-espuma
        "
      />

      {/* =========================================================
          3. ILUMINAÇÃO INTERNA
         ========================================================= */}

      <div
        className="
          absolute top-[30%] left-[18%]
          size-150
          rounded-full
          bg-amber-400/25
          blur-[110px]
          mix-blend-screen
          animate-luz-chopp
        "
      />

      <div
        className="
          absolute right-[15%] bottom-[8%]
          size-110
          rounded-full
          bg-yellow-500/20
          blur-[100px]
          mix-blend-screen
          animate-luz-chopp-reverse
        "
      />

      {/* =========================================================
          4. REFLEXOS DO COPO
         ========================================================= */}

      <div
        className="
          absolute top-0 left-1/4 z-1
          h-full w-40
          skew-x-12
          bg-linear-to-r
          from-transparent
          via-white/8
          to-transparent
          blur-lg
          animate-reflexo
        "
      />

      <div
        className="
          absolute top-0 right-1/3 z-1
          h-full w-28
          -skew-x-12
          bg-linear-to-r
          from-transparent
          via-amber-200/12
          to-transparent
          blur-xl
          animate-reflexo-2
        "
      />

      <div
        className="
          absolute top-0 left-[48%] z-1
          h-full w-10
          bg-linear-to-r
          from-transparent
          via-white/5
          to-transparent
          blur-md
          animate-reflexo-suave
        "
      />

      {/* =========================================================
          5. EFERVESCÊNCIA PRINCIPAL
         ========================================================= */}

      <div className="absolute inset-0 z-2">
        {bubbles.map((style, index) => (
          <span
            key={index}
            className="bolha-randomica absolute rounded-full bg-amber-50"
            style={style}
          />
        ))}
      </div>

      {/* =========================================================
          6. MICRO-BOLHAS
         ========================================================= */}

      <svg
        className="
          absolute inset-0 z-1 size-full
          opacity-[0.10]
          animate-microbolhas
        "
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="efervescencia-vidro-pro"
            width="25"
            height="25"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="6"
              cy="6"
              r="0.9"
              fill="#fef3c7"
              opacity="0.55"
            />

            <circle
              cx="18"
              cy="18"
              r="1.4"
              fill="#fef3c7"
              opacity="0.8"
            />

            <circle
              cx="12"
              cy="22"
              r="0.6"
              fill="#fef3c7"
              opacity="0.35"
            />

            <circle
              cx="22"
              cy="8"
              r="0.5"
              fill="#fff7ed"
              opacity="0.4"
            />
          </pattern>
        </defs>

        <rect
          width="100%"
          height="100%"
          fill="url(#efervescencia-vidro-pro)"
        />
      </svg>

      {/* =========================================================
          7. ONDA DE LUZ
         ========================================================= */}

      <div
        className="
          absolute bottom-[12%] left-[-20%]
          h-32 w-[140%]
          rounded-[50%]
          bg-amber-300/8
          blur-2xl
          animate-onda-chopp
        "
      />

      {/* =========================================================
          8. VINHETA FINAL
         ========================================================= */}

      <div
        className="
          absolute inset-0 z-20
          bg-linear-to-t
          from-black/25
          via-transparent
          to-white/5
        "
      />
    </div>
  );
}