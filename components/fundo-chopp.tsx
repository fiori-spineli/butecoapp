export function FundoChopp() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Glow Dourado de Chopp */}
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-amber-500/20 blur-3xl transform-gpu" />
      <div className="absolute bottom-10 right-10 size-96 rounded-full bg-amber-600/15 blur-3xl transform-gpu" />

      {/* Bolhas com aceleração de GPU (will-change) */}
      <div className="absolute left-[18%] bottom-0 size-2.5 rounded-full bg-amber-200/40 anim-bolha-1 will-change-transform" />
      <div className="absolute left-[38%] bottom-0 size-1.5 rounded-full bg-amber-100/50 anim-bolha-2 will-change-transform" />
      <div className="absolute left-[62%] bottom-0 size-3 rounded-full bg-amber-200/35 anim-bolha-3 will-change-transform" />
      <div className="absolute left-[80%] bottom-0 size-2 rounded-full bg-amber-100/45 anim-bolha-4 will-change-transform" />

      <svg className="absolute inset-0 size-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <pattern id="efervescencia" width="60" height="60" patternUnits="userSpaceOnUse">
          <circle cx="15" cy="15" r="1.5" fill="#fef3c7" />
          <circle cx="45" cy="35" r="2" fill="#fef3c7" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#efervescencia)" />
      </svg>
    </div>
  );
}