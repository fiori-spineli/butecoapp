import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import { AdminViewContainer } from "./admin-view-container";

export const dynamic = "force-dynamic";

const connectionString = (process.env.DATABASE_URL || "")
  .replace("postgresql+psycopg://", "postgresql://")
  .replace("postgresql+asyncpg://", "postgresql://");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("buteco_session")?.value;

  if (!token) redirect("/login");

  let isAdmin = false;
  try {
    const dados = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    isAdmin = Boolean(dados.is_admin);
  } catch {
    redirect("/login");
  }

  if (!isAdmin) redirect("/dashboard");

  // Busca as métricas direto do PostgreSQL no Neon
  let totalBares = 0;
  let totalProdutos = 0;
  let comandasAbertas = 0;
  let comandasFechadas = 0;
  let interessados: any[] = [];

  try {
    const [bRes, pRes, cRes, iRes] = await Promise.all([
      pool.query("SELECT count(*) FROM public.bars"),
      pool.query("SELECT count(*) FROM public.produtos"),
      pool.query("SELECT count(*) FILTER (WHERE status = 'aberta') as abertas, count(*) FILTER (WHERE status = 'fechada') as fechadas FROM public.clientes"),
      pool.query("SELECT * FROM public.interessados ORDER BY created_at DESC LIMIT 50"),
    ]);

    totalBares = parseInt(bRes.rows[0]?.count || "0");
    totalProdutos = parseInt(pRes.rows[0]?.count || "0");
    comandasAbertas = parseInt(cRes.rows[0]?.abertas || "0");
    comandasFechadas = parseInt(cRes.rows[0]?.fechadas || "0");
    interessados = iRes.rows || [];
  } catch (err) {
    console.error("[admin page] erro ao consultar Neon:", err);
  }

  const metricas: any = {
    infra: {
      tamanho_banco: "Neon Serverless",
      conexoes_ativas: 1,
      versao_postgres: "PostgreSQL 16 (AWS sa-east-1)",
      total_usuarios: 8,
    },
    negocio: {
      total_bares: totalBares,
      total_produtos: totalProdutos,
      comandas_abertas: comandasAbertas,
      comandas_fechadas: comandasFechadas,
    },
    bares: [],
  };

  const statusMfa = {
    temFatorAtivo: true,
    precisaVerificar: false,
  };

  return (
    <main className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors p-6 md:p-10">
      <AdminViewContainer
        statusMfa={statusMfa}
        metricas={metricas}
        interessados={interessados}
      />
    </main>
  );
}