export function FundoChopp() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Luz ambiente dourada de chopp */}
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-amber-500/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 size-96 rounded-full bg-amber-600/15 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-112.5 rounded-full bg-amber-700/10 blur-3xl" />

      {/* Bolhas ascendentes ultra-leves */}
      <div className="absolute left-[15%] bottom-0 size-2.5 rounded-full bg-amber-200/40 anim-bolha-1" />
      <div className="absolute left-[35%] bottom-0 size-1.5 rounded-full bg-amber-100/50 anim-bolha-2" />
      <div className="absolute left-[55%] bottom-0 size-3 rounded-full bg-amber-200/35 anim-bolha-3" />
      <div className="absolute left-[75%] bottom-0 size-2 rounded-full bg-amber-100/45 anim-bolha-4" />
      <div className="absolute left-[88%] bottom-0 size-1.5 rounded-full bg-amber-200/50 anim-bolha-5" />

      {/* Textura leve efervescente */}
      <svg className="absolute inset-0 size-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
        <pattern id="efervescencia" width="48" height="48" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="1.5" fill="#fef3c7" />
          <circle cx="36" cy="28" r="2" fill="#fef3c7" />
          <circle cx="24" cy="40" r="1" fill="#fef3c7" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#efervescencia)" />
      </svg>
    </div>
  );
}