import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checarSeEhAdmin } from "@/app/actions/admin";
import { listarInteressados } from "@/app/actions/interessados";
import { verificarStatusMFA } from "@/app/actions/mfa";
import { AdminViewContainer } from "./admin-view-container";
import type { ClienteAdmin } from "./gestao-clientes";

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
  };
  // Ver gestao-clientes.tsx: o painel mede uso, nunca faturamento.
  bares: ClienteAdmin[];
}

export default async function AdminPage() {
  const ehAdmin = await checarSeEhAdmin();
  if (!ehAdmin) redirect("/dashboard");

  // Checa se o MFA precisa de verificação
  const statusMfa = await verificarStatusMFA();

  /*
   * Nada é buscado antes do segundo fator — e essa ordem é o conserto de um
   * vazamento real.
   *
   * O painel é renderizado no servidor. Antes, as métricas (com o e-mail do
   * dono de CADA bar) e a fila de interessados (com nome, e-mail e telefone de
   * quem pediu acesso) eram buscadas sempre e mandadas como props; a tela do
   * 2FA só escondia isso no navegador. Quem tivesse a senha do admin abria o
   * código-fonte da página e lia tudo sem digitar código nenhum.
   *
   * Agora quem não passou pelo segundo fator recebe uma página com o cadeado e
   * mais nada dentro. O MfaGate chama router.refresh() ao destravar, e aí sim
   * o servidor renderiza de novo — já em aal2 — com os dados.
   */
  const liberado = statusMfa.temFatorAtivo && !statusMfa.precisaVerificar;

  const supabase = await createSupabaseServerClient();
  const [{ data }, interessados] = liberado
    ? await Promise.all([supabase.rpc("painel_admin_metricas"), listarInteressados()])
    : [{ data: null }, []];

  const metricas = data as TelemetriaAdmin | null;

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
