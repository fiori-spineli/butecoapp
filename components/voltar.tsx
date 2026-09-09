import Link from "next/link";

export function VoltarPara({ href, rotulo = "Voltar" }: { href: string; rotulo?: string }) {
  return (
    <Link
      href={href}
      aria-label={rotulo}
      className="cursor-pointer -m-2 flex size-11 shrink-0 items-center justify-center rounded-full text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  );
}