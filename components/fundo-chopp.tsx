export function FundoChopp() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-linear-to-b from-amber-800 via-amber-950 to-stone-950">
      {/* 1. O Colarinho (Espuma Cremosa Orgânica no Topo) */}
      <div className="absolute top-0 inset-x-0 h-32 bg-linear-to-b from-amber-100/40 via-amber-200/20 to-transparent blur-2xl transform-gpu" />
      <div className="absolute -top-12 left-10 w-[120%] h-28 rounded-[100%] bg-amber-50/25 blur-3xl transform-gpu opacity-80" />

      {/* 2. Brilho do Líquido Dourado (Efeito de Copo Iluminado por Trás) */}
      <div className="absolute top-1/4 left-1/3 size-150 rounded-full bg-amber-400/20 blur-[140px] transform-gpu mix-blend-screen" />
      <div className="absolute bottom-10 right-1/4 size-112.5 rounded-full bg-yellow-500/15 blur-[120px] transform-gpu mix-blend-screen" />

      {/* 3. Feixe de Luz Vertical (Reflexo no Vidro) */}
      <div className="absolute top-0 left-1/3 w-32 h-full bg-linear-to-r from-transparent via-amber-200/10 to-transparent skew-x-[-15deg] blur-2xl transform-gpu" />

      {/* 4. Bolhas de Cerveja Subindo em Profundidade 3D (Efervescência) */}
      <div className="absolute left-[12%] bottom-0 size-2.5 rounded-full bg-amber-100/70 anim-bolha-1 will-change-transform shadow-[0_0_10px_rgba(254,243,199,0.8)]" />
      <div className="absolute left-[24%] bottom-0 size-1.5 rounded-full bg-yellow-200/50 anim-bolha-2 will-change-transform blur-[0.5px]" />
      <div className="absolute left-[38%] bottom-0 size-3.5 rounded-full bg-amber-50/80 anim-bolha-3 will-change-transform shadow-[0_0_14px_rgba(254,243,199,0.9)]" />
      <div className="absolute left-[52%] bottom-0 size-2 rounded-full bg-amber-100/60 anim-bolha-5 will-change-transform blur-[1px]" />
      <div className="absolute left-[65%] bottom-0 size-3 rounded-full bg-yellow-100/75 anim-bolha-4 will-change-transform shadow-[0_0_12px_rgba(254,243,199,0.7)]" />
      <div className="absolute left-[78%] bottom-0 size-1.5 rounded-full bg-amber-200/55 anim-bolha-2 will-change-transform" />
      <div className="absolute left-[88%] bottom-0 size-4 rounded-full bg-amber-50/85 anim-bolha-1 will-change-transform shadow-[0_0_16px_rgba(254,243,199,0.95)]" />

      {/* 5. Textura de Gás / Micro-bolhas (SVG Fino) */}
      <svg className="absolute inset-0 size-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
        <pattern id="efervescencia-pro" width="30" height="30" patternUnits="userSpaceOnUse">
          <circle cx="8" cy="8" r="1" fill="#fef3c7" />
          <circle cx="22" cy="22" r="1.5" fill="#fef3c7" />
          <circle cx="15" cy="27" r="0.7" fill="#fef3c7" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#efervescencia-pro)" />
      </svg>
    </div>
  );
}