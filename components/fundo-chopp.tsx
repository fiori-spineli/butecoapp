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
  "--bubble-blur": string;
  "--bubble-glow": string;
  "--bubble-fade": string;
};

/**
 * Pseudo-random determinístico.
 *
 * Os valores continuam parecendo aleatórios,
 * mas nunca mudam durante um re-render.
 */
function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Cria as bolhas com características individuais.
 *
 * Cada uma possui:
 * - posição horizontal própria
 * - tamanho
 * - opacidade
 * - velocidade
 * - atraso
 * - trajetória horizontal própria
 * - pequenas variações de velocidade
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

    /* Posição horizontal */
    const left = 3 + r1 * 94;

    /* Distribuição de tamanhos */
    let size: number;

    if (r2 < 0.58) {
      size = 1 + r3 * 2.4;
    } else if (r2 < 0.9) {
      size = 2.5 + r3 * 3.5;
    } else {
      size = 5 + r3 * 4.5;
    }

    /* Opacidade individual */
    const opacity = 0.1 + r4 * 0.75;

    /*
     * Velocidade individual.
     *
     * Algumas bolhas sobem rapidamente,
     * outras ficam mais tempo no líquido.
     */
    const duration = 5.5 + r5 * 9;

    /* Delay negativo faz o fundo já nascer "em movimento". */
    const delay = -(r6 * duration);

    /*
     * Intensidade do zigue-zague.
     *
     * Algumas bolhas quase sobem retas.
     * Outras fazem desvios mais perceptíveis.
     */
    const driftIntensity = 5 + r7 * 24;

    const direction = r8 > 0.5 ? 1 : -1;

    const drift1 =
      direction * (3 + r1 * driftIntensity);

    const drift2 =
      -direction * (2 + r2 * driftIntensity);

    const drift3 =
      direction * (4 + r3 * driftIntensity);

    const drift4 =
      -direction * (3 + r4 * driftIntensity);

    const drift5 =
      direction * (2 + r5 * driftIntensity);

    const drift6 =
      -direction * (1 + r6 * driftIntensity);

    /*
     * Bolhas maiores recebem brilho.
     * As pequenas ficam praticamente sem glow.
     */
    const glow =
      size >= 5
        ? Math.round(4 + r6 * 8)
        : size >= 3
          ? Math.round(2 + r6 * 5)
          : 0;

    /*
     * O final da trajetória perde um pouco de opacidade
     * antes de desaparecer.
     */
    const fade = Math.max(0.5, 0.7 + r8 * 0.3);

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

      "--bubble-scale": (0.75 + r7 * 0.7).toFixed(2),
      "--bubble-blur":
        size < 2.5
          ? "0.35px"
          : size < 4
            ? "0.15px"
            : "0px",

      "--bubble-glow": `${glow}px`,
      "--bubble-fade": fade.toFixed(2),

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

/*
 * Geradas uma única vez.
 *
 * Isso evita recalcular Math/randomização em cada render.
 */
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
          3. LUZ INTERNA DO CHOPP
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
          5. BOLHAS RANDOMIZADAS
         ========================================================= */}

      <div className="absolute inset-0 z-2">
        {bubbles.map((style, index) => (
          <span
            key={index}
            className="
              bolha-randomica
              absolute
              rounded-full
              bg-amber-50
            "
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