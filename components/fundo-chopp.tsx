export function FundoChopp() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-linear-to-b from-amber-700 via-amber-950 to-stone-950">
      {/* 1. Efeito de Vidro Curvo (Vinheta 3D de Borda de Caneca) */}
      <div className="absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.8)] z-10 pointer-events-none transform-gpu" />

      {/* 2. O Colarinho / Espuma Cremosa Rica com Degrade */}
      <div className="absolute top-0 inset-x-0 h-40 bg-linear-to-b from-amber-100/50 via-amber-200/25 to-transparent blur-2xl transform-gpu z-0" />
      <div className="absolute -top-12 left-5 w-[110%] h-32 rounded-[100%] bg-amber-50/35 blur-3xl transform-gpu opacity-95 z-0" />

      {/* 3. Brilho Dourado Traseiro (Líquido Iluminado) */}
      <div className="absolute top-1/3 left-1/4 size-175 rounded-full bg-amber-400/30 blur-[150px] transform-gpu mix-blend-screen" />
      <div className="absolute bottom-10 right-1/4 size-125 rounded-full bg-yellow-500/25 blur-[130px] transform-gpu mix-blend-screen" />

      {/* 4. Reflexos Verticais no Vidro (Curvatura Cilíndrica) */}
      <div className="absolute top-0 left-1/4 w-48 h-full bg-linear-to-r from-transparent via-white/10 to-transparent skew-x-[-12deg] blur-xl transform-gpu z-1" />
      <div className="absolute top-0 right-1/3 w-32 h-full bg-linear-to-r from-transparent via-amber-200/15 to-transparent skew-x-[15deg] blur-2xl transform-gpu z-1" />

      {/* 5. Efervescência Rica com Múltiplas Transparências e Tamanhos (Profundidade 3D) */}
      {/* Camada Profunda (Muito transparentes e menores) */}
      <div className="absolute left-[8%] bottom-[-20px] size-1 rounded-full bg-amber-200/20 anim-bolha-2 will-change-transform z-2" />
      <div className="absolute left-[22%] bottom-[-20px] size-1.5 rounded-full bg-amber-100/25 anim-bolha-4 will-change-transform blur-[0.5px] z-2" />
      <div className="absolute left-[41%] bottom-[-20px] size-1 rounded-full bg-yellow-100/15 anim-bolha-1 will-change-transform z-2" />
      <div className="absolute left-[59%] bottom-[-20px] size-1.5 rounded-full bg-amber-50/20 anim-bolha-3 will-change-transform blur-[0.5px] z-2" />
      <div className="absolute left-[73%] bottom-[-20px] size-1 rounded-full bg-amber-200/25 anim-bolha-5 will-change-transform z-2" />
      <div className="absolute left-[85%] bottom-[-20px] size-1.5 rounded-full bg-yellow-200/20 anim-bolha-2 will-change-transform z-2" />

      {/* Camada Média (Opacidade moderada) */}
      <div className="absolute left-[15%] bottom-[-20px] size-2 rounded-full bg-amber-100/50 anim-bolha-1 will-change-transform shadow-[0_0_6px_rgba(254,243,199,0.5)] z-2" />
      <div className="absolute left-[32%] bottom-[-20px] size-2.5 rounded-full bg-amber-50/60 anim-bolha-3 will-change-transform shadow-[0_0_8px_rgba(254,243,199,0.6)] z-2" />
      <div className="absolute left-[50%] bottom-[-20px] size-2 rounded-full bg-amber-100/45 anim-bolha-5 will-change-transform blur-[0.5px] z-2" />
      <div className="absolute left-[68%] bottom-[-20px] size-3 rounded-full bg-yellow-100/55 anim-bolha-4 will-change-transform shadow-[0_0_10px_rgba(254,243,199,0.6)] z-2" />
      <div className="absolute left-[92%] bottom-[-20px] size-2 rounded-full bg-amber-50/50 anim-bolha-1 will-change-transform z-2" />

      {/* Camada Frontal (Maiores, mais nítidas e brilhantes) */}
      <div className="absolute left-[19%] bottom-[-20px] size-3.5 rounded-full bg-amber-50/80 anim-bolha-3 will-change-transform shadow-[0_0_14px_rgba(254,243,199,0.9)] z-2" />
      <div className="absolute left-[47%] bottom-[-20px] size-4 rounded-full bg-yellow-50/85 anim-bolha-1 will-change-transform shadow-[0_0_16px_rgba(254,243,199,0.95)] z-2" />
      <div className="absolute left-[81%] bottom-[-20px] size-3.5 rounded-full bg-amber-100/75 anim-bolha-5 will-change-transform shadow-[0_0_12px_rgba(254,243,199,0.8)] z-2" />

      {/* 6. Textura de Gás / Micro-bolhas em Padrão SVG */}
      <svg className="absolute inset-0 size-full opacity-[0.11] z-1" xmlns="http://www.w3.org/2000/svg">
        <pattern id="efervescencia-vidro-pro" width="25" height="25" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="0.9" fill="#fef3c7" opacity="0.6" />
          <circle cx="18" cy="18" r="1.4" fill="#fef3c7" opacity="0.9" />
          <circle cx="12" cy="22" r="0.6" fill="#fef3c7" opacity="0.4" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#efervescencia-vidro-pro)" />
      </svg>
    </div>
  );
}