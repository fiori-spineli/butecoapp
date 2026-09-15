import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { AvatarBar } from "@/components/avatar-bar";
import { BotaoSair } from "@/components/botao-sair";
import { NavPrincipal, type AbaAtiva } from "@/components/tab-bar";

export function CabecalhoDono({
  ativo,
  titulo,
  subtitulo,
  fotoUrl,
  acoes,
}: {
  ativo: AbaAtiva;
  titulo?: string;
  subtitulo?: string;
  fotoUrl?: string | null;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-3 gap-x-3 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-3.5 md:grid md:grid-cols-[auto_1fr_auto]">
      
      {/* Lado Esquerdo: Logo do Buteco + Avatar do Bar */}
      <div className="flex items-center gap-3 sm:gap-4">
        <LogoButeco className="w-28 sm:w-36 h-9 sm:h-11 shrink-0" priority />
        <AvatarBar url={fotoUrl} nome={titulo} tamanho={38} />

        {titulo && (
          <div className="hidden min-w-0 border-l border-stone-200 dark:border-stone-800 pl-3.5 lg:block">
            <h1 className="text-sm sm:text-base font-black leading-tight text-stone-900 dark:text-stone-100 truncate">
              {titulo}
            </h1>
            {subtitulo && (
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                {subtitulo}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Centro: Abas Principais */}
      <div className="flex justify-center w-full md:w-auto order-1 md:order-0 pt-2 md:pt-0">
        <NavPrincipal ativo={ativo} />
      </div>

      {/* Lado Direito: Ações + Perfil + Sair */}
      <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
        {acoes}
        <Link
          href="/perfil"
          prefetch={true}
          className="cursor-pointer inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-4 sm:px-5 py-2.5 text-xs md:text-sm font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          Perfil
        </Link>
        <BotaoSair />
      </div>
    </header>
  );
}