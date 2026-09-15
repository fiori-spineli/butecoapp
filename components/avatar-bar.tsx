import Image from "next/image";

export function AvatarBar({
  url,
  nome,
  tamanho = 38,
}: {
  url?: string | null;
  nome?: string;
  tamanho?: number;
}) {
  if (url) {
    return (
      <div
        className="relative rounded-full border border-amber-600/50 overflow-hidden shrink-0 shadow-xs bg-stone-100 dark:bg-stone-800"
        style={{ width: tamanho, height: tamanho }}
      >
        <Image src={url} alt={nome ?? "Logo do Bar"} fill className="object-cover" />
      </div>
    );
  }

  // Fallback padrão: caneca de chopp artesanal dourada em degradê âmbar
  return (
    <div
      className="relative rounded-full border border-amber-500/50 bg-linear-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white shrink-0 shadow-xs"
      style={{ width: tamanho, height: tamanho }}
      title={nome ?? "Bar"}
    >
      <svg
        width={Math.round(tamanho * 0.52)}
        height={Math.round(tamanho * 0.52)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17 11h1a3 3 0 0 1 0 6h-1" />
        <path d="M9 2v3M13 2v3" />
        <path d="M5 5h12v12a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" />
      </svg>
    </div>
  );
}