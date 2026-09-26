import { redirect } from "next/navigation";
import { getNeonSession } from "@/lib/neon-session";
import { neonPool } from "@/lib/neon-db";
import { verificarStatusMFA } from "@/app/actions/mfa";
import { listarInteressadosNoNeon } from "@/lib/neon/interessados";
import { AdminViewContainer } from "./admin-view-container";
import type { ClienteAdmin } from "./gestao-clientes";

export const dynamic = "force-dynamic";

export interface TelemetriaAdmin {
  infra: { tamanho_banco: string; conexoes_ativas: number; versao_postgres: string; total_usuarios: number };
  negocio: { total_bares: number; total_produtos: number; comandas_abertas: number; comandas_fechadas: number };
  bares: ClienteAdmin[];
}

async function metricasAdmin(): Promise<TelemetriaAdmin> {
  const [infra, negocio, bares] = await Promise.all([
    neonPool.query<{
      tamanho_banco: string; conexoes_ativas: number; versao_postgres: string; total_usuarios: number;
    }>(`SELECT pg_size_pretty(pg_database_size(current_database())) AS tamanho_banco,
       (SELECT count(*)::int FROM pg_stat_activity WHERE datname=current_database()) AS conexoes_ativas,
       current_setting('server_version') AS versao_postgres,
       (SELECT count(*)::int FROM public.users) AS total_usuarios`),
    neonPool.query<{
      total_bares: number; total_produtos: number; comandas_abertas: number; comandas_fechadas: number;
    }>(`SELECT (SELECT count(*)::int FROM public.bars) AS total_bares,
       (SELECT count(*)::int FROM public.produtos) AS total_produtos,
       (SELECT count(*)::int FROM public.clientes WHERE status='aberta') AS comandas_abertas,
       (SELECT count(*)::int FROM public.clientes WHERE status='fechada') AS comandas_fechadas`),
    neonPool.query<ClienteAdmin>(`SELECT b.id,b.nome,b.slug,b.created_at,b.owner_id,
       u.email AS owner_email,(u.email_verified_at IS NOT NULL) AS email_confirmado,
       u.last_login_at AS ultimo_login,(u.suspended_at IS NOT NULL) AS suspenso,
       (SELECT count(*)::int FROM public.produtos p WHERE p.bar_id=b.id) AS total_produtos,
       (SELECT count(*)::int FROM public.clientes c WHERE c.bar_id=b.id) AS total_comandas,
       (SELECT count(*)::int FROM public.clientes c WHERE c.bar_id=b.id AND c.status='aberta') AS comandas_abertas,
       (SELECT max(c.created_at) FROM public.clientes c WHERE c.bar_id=b.id) AS ultima_atividade
      FROM public.bars b JOIN public.users u ON u.id=b.owner_id ORDER BY b.created_at DESC`),
  ]);
  return { infra: infra.rows[0], negocio: negocio.rows[0], bares: bares.rows };
}

export default async function AdminPage() {
  const session = await getNeonSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/dashboard");
  const statusMfa = await verificarStatusMFA();
  const verified = statusMfa.temFatorAtivo && !statusMfa.precisaVerificar;
  const [metricas, interessados] = verified
    ? await Promise.all([metricasAdmin(), listarInteressadosNoNeon()])
    : [null, []];
  return <main className="min-h-screen bg-stone-100 p-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100 md:p-10">
    <AdminViewContainer statusMfa={statusMfa} metricas={metricas} interessados={interessados} />
  </main>;
}
