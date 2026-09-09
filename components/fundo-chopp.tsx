export function FundoChopp() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-gradient-to-b from-amber-900/40 via-amber-950/90 to-stone-950">
      {/* 1. O Colarinho (Espuma do Chopp no Topo) */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-amber-100/25 via-amber-200/10 to-transparent blur-xl transform-gpu" />
      <div className="absolute -top-10 left-1/4 w-96 h-20 rounded-full bg-amber-50/15 blur-2xl transform-gpu" />

      {/* 2. Glow e Reflexos Dourados do Líquido */}
      <div className="absolute top-1/3 left-1/4 size-[500px] rounded-full bg-amber-500/15 blur-[120px] transform-gpu" />
      <div className="absolute bottom-10 right-10 size-96 rounded-full bg-yellow-600/15 blur-[100px] transform-gpu" />

      {/* 3. Efervescência / Bolhas de Cerveja Subindo em Camadas */}
      <div className="absolute left-[10%] bottom-0 size-2 rounded-full bg-amber-100/60 anim-bolha-1 will-change-transform shadow-[0_0_8px_rgba(254,243,199,0.6)]" />
      <div className="absolute left-[25%] bottom-0 size-3 rounded-full bg-amber-50/70 anim-bolha-3 will-change-transform shadow-[0_0_10px_rgba(254,243,199,0.7)]" />
      <div className="absolute left-[42%] bottom-0 size-1.5 rounded-full bg-amber-200/50 anim-bolha-2 will-change-transform" />
      <div className="absolute left-[58%] bottom-0 size-2.5 rounded-full bg-amber-100/60 anim-bolha-4 will-change-transform shadow-[0_0_8px_rgba(254,243,199,0.6)]" />
      <div className="absolute left-[72%] bottom-0 size-3.5 rounded-full bg-amber-50/75 anim-bolha-1 will-change-transform shadow-[0_0_12px_rgba(254,243,199,0.8)]" />
      <div className="absolute left-[88%] bottom-0 size-2 rounded-full bg-amber-200/55 anim-bolha-5 will-change-transform" />

      {/* 4. Padronização de Textura de Gás */}
      <svg className="absolute inset-0 size-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
        <pattern id="efervescencia-cerveja" width="40" height="40" patternUnits="userSpaceOnUse">
          <circle cx="10" cy="10" r="1.2" fill="#fef3c7" />
          <circle cx="30" cy="30" r="1.8" fill="#fef3c7" />
          <circle cx="20" cy="35" r="0.8" fill="#fef3c7" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#efervescencia-cerveja)" />
      </svg>
    </div>
  );
}