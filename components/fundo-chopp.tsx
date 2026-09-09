export function FundoChopp() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-linear-to-b from-amber-700 via-amber-950 to-stone-950">
      {/* 1. Efeito de Vidro Curvo (Vinheta 3D de Borda de Caneca) */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.7)] z-10 pointer-events-none transform-gpu" />

      {/* 2. O Colarinho / Espuma Cremosa Rica com Degrade */}
      <div className="absolute top-0 inset-x-0 h-36 bg-linear-to-b from-amber-100/45 via-amber-200/20 to-transparent blur-xl transform-gpu z-0" />
      <div className="absolute -top-10 left-5 w-[110%] h-32 rounded-[100%] bg-amber-50/30 blur-2xl transform-gpu opacity-90 z-0" />

      {/* 3. Brilho Dourado Traseiro (Líquido Iluminado) */}
      <div className="absolute top-1/3 left-1/4 size-150 rounded-full bg-amber-400/25 blur-[130px] transform-gpu mix-blend-screen" />
      <div className="absolute bottom-10 right-1/4 size-112.5 rounded-full bg-yellow-500/20 blur-[110px] transform-gpu mix-blend-screen" />

      {/* 4. Reflexos Verticais no Vidro (Curvatura Cilíndrica) */}
      <div className="absolute top-0 left-1/4 w-40 h-full bg-linear-to-r from-transparent via-white/8 to-transparent skew-x-[-12deg] blur-xl transform-gpu z-1" />
      <div className="absolute top-0 right-1/4 w-24 h-full bg-linear-to-r from-transparent via-amber-200/10 to-transparent skew-x-[15deg] blur-2xl transform-gpu z-1" />

      {/* 5. Efervescência Natural Corrigida (Nascem Submersas e Suaves) */}
      <div className="absolute left-[15%] bottom-[-20px] size-2 rounded-full bg-amber-100/70 anim-bolha-1 will-change-transform shadow-[0_0_8px_rgba(254,243,199,0.8)] z-2" />
      <div className="absolute left-[28%] bottom-[-20px] size-3 rounded-full bg-amber-50/80 anim-bolha-3 will-change-transform shadow-[0_0_12px_rgba(254,243,199,0.9)] z-2" />
      <div className="absolute left-[45%] bottom-[-20px] size-1.5 rounded-full bg-yellow-200/50 anim-bolha-2 will-change-transform blur-[0.5px] z-2" />
      <div className="absolute left-[60%] bottom-[-20px] size-2.5 rounded-full bg-amber-100/60 anim-bolha-5 will-change-transform blur-[0.8px] z-2" />
      <div className="absolute left-[75%] bottom-0 size-3.5 rounded-full bg-yellow-100/75 anim-bolha-4 will-change-transform shadow-[0_0_14px_rgba(254,243,199,0.8)] z-2" />
      <div className="absolute left-[90%] bottom-[-20px] size-2 rounded-full bg-amber-50/90 anim-bolha-1 will-change-transform shadow-[0_0_10px_rgba(254,243,199,0.9)] z-2" />

      {/* 6. Textura de Gás / Micro-bolhas em Padrão SVG */}
      <svg className="absolute inset-0 size-full opacity-[0.09] z-1" xmlns="http://www.w3.org/2000/svg">
        <pattern id="efervescencia-vidro" width="35" height="35" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1.1" fill="#fef3c7" />
          <circle cx="25" cy="25" r="1.6" fill="#fef3c7" />
          <circle cx="18" cy="30" r="0.8" fill="#fef3c7" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#efervescencia-vidro)" />
      </svg>
    </div>
  );
}