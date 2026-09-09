export function FundoChopp() {
  return (
    <div
      className="
        absolute inset-0 z-0 overflow-hidden
        pointer-events-none
        bg-linear-to-b from-amber-700 via-amber-950 to-stone-950
      "
      aria-hidden="true"
    >
      {/* =========================================================
          1. VINHETA / EFEITO DE VIDRO
         ========================================================= */}

      <div
        className="
          absolute inset-0 z-10
          shadow-[inset_0_0_110px_rgba(0,0,0,0.72)]
        "
      />

      {/* =========================================================
          2. ESPUMA / COLARINHO
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

      {/* Pequeno brilho horizontal da espuma */}
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
          3. LUZ DOURADA DO CHOPP
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
          4. REFLEXOS VERTICAIS DO COPO
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

      {/* Reflexo central mais discreto */}
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
          5. BOLHAS — CAMADA PROFUNDA
         ========================================================= */}

      <div className="absolute -bottom-5 left-[8%] size-1 rounded-full bg-amber-200/20 anim-bolha-2" />
      <div className="absolute -bottom-5 left-[22%] size-1.5 rounded-full bg-amber-100/25 anim-bolha-4 blur-[0.5px]" />
      <div className="absolute -bottom-5 left-[41%] size-1 rounded-full bg-yellow-100/15 anim-bolha-1" />
      <div className="absolute -bottom-5 left-[59%] size-1.5 rounded-full bg-amber-50/20 anim-bolha-3 blur-[0.5px]" />
      <div className="absolute -bottom-5 left-[73%] size-1 rounded-full bg-amber-200/25 anim-bolha-5" />
      <div className="absolute -bottom-5 left-[85%] size-1.5 rounded-full bg-yellow-200/20 anim-bolha-2" />

      {/* =========================================================
          6. BOLHAS — CAMADA MÉDIA
         ========================================================= */}

      <div
        className="
          absolute -bottom-5 left-[15%] size-2
          rounded-full
          bg-amber-100/50
          anim-bolha-1
          shadow-[0_0_5px_rgba(254,243,199,0.45)]
        "
      />

      <div
        className="
          absolute -bottom-5 left-[32%] size-2.5
          rounded-full
          bg-amber-50/60
          anim-bolha-3
          shadow-[0_0_7px_rgba(254,243,199,0.5)]
        "
      />

      <div
        className="
          absolute -bottom-5 left-[50%] size-2
          rounded-full
          bg-amber-100/45
          anim-bolha-5
          blur-[0.5px]
        "
      />

      <div
        className="
          absolute -bottom-5 left-[68%] size-3
          rounded-full
          bg-yellow-100/55
          anim-bolha-4
          shadow-[0_0_8px_rgba(254,243,199,0.55)]
        "
      />

      <div
        className="
          absolute -bottom-5 left-[92%] size-2
          rounded-full
          bg-amber-50/50
          anim-bolha-1
        "
      />

      {/* =========================================================
          7. BOLHAS — CAMADA FRONTAL
         ========================================================= */}

      <div
        className="
          absolute -bottom-5 left-[19%] size-3.5
          rounded-full
          bg-amber-50/80
          anim-bolha-3
          shadow-[0_0_11px_rgba(254,243,199,0.8)]
        "
      />

      <div
        className="
          absolute -bottom-5 left-[47%] size-4
          rounded-full
          bg-yellow-50/85
          anim-bolha-1
          shadow-[0_0_13px_rgba(254,243,199,0.85)]
        "
      />

      <div
        className="
          absolute -bottom-5 left-[81%] size-3.5
          rounded-full
          bg-amber-100/75
          anim-bolha-5
          shadow-[0_0_10px_rgba(254,243,199,0.7)]
        "
      />

      {/* =========================================================
          8. MICRO-BOLHAS
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
          9. ONDA DE LUZ NO CHOPP
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
          10. VINHETA FINAL
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