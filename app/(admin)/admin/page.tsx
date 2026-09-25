import { redirect } from "next/navigation";
import { getNeonSession } from "@/lib/neon-session";
import { BotaoSair } from "@/components/botao-sair";
import type { ClienteAdmin } from "./gestao-clientes";

export const dynamic = "force-dynamic";

export interface TelemetriaAdmin {
  infra: { tamanho_banco: string; conexoes_ativas: number; versao_postgres: string; total_usuarios: number };
  negocio: { total_bares: number; total_produtos: number; comandas_abertas: number; comandas_fechadas: number };
  bares: ClienteAdmin[];
}

export default async function AdminPage() {
  const session = await getNeonSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/dashboard");

  // O MFA antigo depende do Supabase. Até existir verificação no Neon,
  // esta rota não consulta nem renderiza dados administrativos.

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 p-8 text-center">
      <h1 className="text-2xl font-bold">Painel administrativo indisponível</h1>
      <p className="max-w-lg text-sm">O acesso será restabelecido quando a verificação em duas etapas estiver pronta no Neon.</p>
      <BotaoSair />
    </main>
  );
}
