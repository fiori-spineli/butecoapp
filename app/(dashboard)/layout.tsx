import { exigirBar } from "@/lib/bar";
import { BannerPwa } from "@/components/banner-pwa";
import { AtualizacaoAoVivo } from "@/components/atualizacao-ao-vivo";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirBar();

  return (
    <div className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      {/* Aqui, e não em cada página: o layout do painel não desmonta quando se
          troca de aba, então a sincronia atravessa a navegação inteira em vez de
          ser derrubada e reerguida a cada clique. Ver lib/sincronia-ao-vivo.ts. */}
      <AtualizacaoAoVivo />
      <BannerPwa />
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col border-x border-stone-200/70 dark:border-stone-800/80 bg-stone-50 dark:bg-stone-900 shadow-sm">
        {children}
      </div>
    </div>
  );
}