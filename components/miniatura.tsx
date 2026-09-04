import Image from "next/image";

/**
 * Miniatura do produto na lista de itens. Sem foto (ou item de descrição
 * livre), mostra um marcador neutro em vez de um buraco no layout.
 */
export function Miniatura({
  url,
  alt,
  tamanho = 36,
}: {
  url: string | null;
  alt: string;
  tamanho?: number;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt={alt}
        width={tamanho}
        height={tamanho}
        className="shrink-0 rounded-lg border border-stone-300 object-cover"
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-stone-200 text-stone-400"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M6 8h12M6 12h12M6 16h8" />
      </svg>
    </span>
  );
}
