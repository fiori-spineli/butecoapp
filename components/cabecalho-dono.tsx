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
      
      {/* 1. Lado Esquerdo: Logo Buteco com tamanho estritamente fixo */}
      <div className="flex items-center gap-3 z-10">
        <Link href="/dashboard" className="cursor-pointer">
          <LogoButeco className="w-32 sm:w-36 h-10 sm:h-11 shrink-0" priority />
        </Link>
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