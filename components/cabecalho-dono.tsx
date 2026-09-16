import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { AvatarBar } from "@/components/avatar-bar";
import { BotaoSair } from "@/components/botao-sair";
import { NavPrincipal, type AbaAtiva } from "@/components/tab-bar";

export function CabecalhoDono({
  ativo,
  fotoUrl,
  nomeBar,
  acoes,
}: {
  ativo: AbaAtiva;
  fotoUrl?: string | null;
  nomeBar?: string;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="relative flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 min-h-16">
      
      {/* 1. Lado esquerdo: logo (volta para Comandas) + nome do bar.
          O nome faltava em TODAS as telas — o dono so via de qual bar era o
          painel na hora de imprimir o fechamento. Ele trunca em vez de
          empurrar o resto, para o centro nunca se mexer. */}
      <div className="flex min-w-0 items-center gap-3 z-10">
        <Link href="/dashboard" className="cursor-pointer shrink-0" aria-label="Ir para Comandas">
          <LogoButeco className="w-36 sm:w-44 h-11 sm:h-14 shrink-0" priority />
        </Link>
        {nomeBar && (
          <span className="hidden lg:block min-w-0 border-l border-stone-200 dark:border-stone-800 pl-3">
            <span className="block truncate text-base font-black leading-tight text-stone-900 dark:text-stone-100">
              {nomeBar}
            </span>
          </span>
        )}
      </div>

      {/* 2. Centro: Abas em Posição Absoluta (Nunca mudam de lugar) */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center pointer-events-auto">
        <NavPrincipal ativo={ativo} />
      </div>

      {/* 3. Lado Direito: Ações + Botão de Perfil (Substituído pela Foto do Bar) + Sair */}
      <div className="flex shrink-0 items-center justify-end gap-2.5 sm:gap-3 z-10">
        {acoes}
        
        {/* O botão 'Perfil' agora é a Logo do Bar com link para /perfil */}
        <Link
          href="/perfil"
          prefetch={true}
          title={nomeBar ? `Ajustes do ${nomeBar}` : "Ajustes do Bar"}
          className="cursor-pointer flex items-center gap-2 rounded-xl p-1 hover:ring-2 hover:ring-amber-600/50 transition-all active:scale-95 shrink-0"
        >
          <AvatarBar url={fotoUrl} nome={nomeBar} tamanho={38} />
        </Link>

        <BotaoSair />
      </div>
    </header>
  );
}