import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checarSeEhAdmin } from "@/app/actions/admin";
import { verificarStatusMFA } from "@/app/actions/mfa";
import { formatarReais, formatarDataHora } from "@/lib/format";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";
import { AcoesAdmin } from "./acoes-admin";
import { AdminViewContainer } from "./admin-view-container";

export const dynamic = "force-dynamic";

interface TelemetriaAdmin {
  infra: {
    tamanho_banco: string;
    conexoes_ativas: number;
    versao_postgres: string;
    total_usuarios: number;
  };
  negocio: {
    total_bares: number;
    total_produtos: number;
    comandas_abertas: number;
    comandas_fechadas: number;
    volume_total_centavos: number;
  };
  bares: Array<{
    id: string;
    nome: string;
    slug: string;
    created_at: string;
    owner_email: string;
    total_produtos: number;
    total_comandas: number;
  }>;
}

export default async function AdminPage() {
  const ehAdmin = await checarSeEhAdmin();
  if (!ehAdmin) redirect("/dashboard");

  // Checa se o MFA precisa de verificação
  const statusMfa = await verificarStatusMFA();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("painel_admin_metricas");
  const metricas = data as TelemetriaAdmin | null;

  return (
    <main className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors p-6 md:p-10">
      <AdminViewContainer
        statusMfa={statusMfa}
        metricas={metricas}
      />
    </main>
  );
}