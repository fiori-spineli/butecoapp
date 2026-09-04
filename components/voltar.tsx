import Link from "next/link";

export function VoltarPara({ href, rotulo = "Voltar" }: { href: string; rotulo?: string }) {
  return (
    <Link
      href={href}
      aria-label={rotulo}
      className="-m-2 shrink-0 rounded-full p-2 text-stone-900 hover:bg-stone-100"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}
