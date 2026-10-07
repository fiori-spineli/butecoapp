import "server-only";

import type { PoolClient } from "pg";
import { neonPool } from "@/lib/neon-db";
import { hashDoIpAtual } from "@/lib/ip";

/**
 * Trilha de auditoria das ações sensíveis (app_private.audit_log, migration 0006).
 *
 * Antes não havia como responder "quem suspendeu este bar?" ou "quem apagou esta
 * conta?": só existia console.error, e só em falha. Agora cada ação administrativa,
 * de acesso e de dinheiro grava ator, alvo, instante e resultado.
 *
 * O que NÃO entra: e-mail, nome, senha, token, código. Ids e o hash do IP bastam
 * para reconstruir a autoria sem transformar a tabela num segundo cadastro.
 *
 * Gravar a trilha nunca derruba a ação registrada: uma falha aqui vira log de
 * erro. Quando a ação roda numa transação, passe `client` para que o registro
 * nasça e morra junto com ela.
 */
export type AcaoAuditada =
  | "login" | "logout" | "mfa_inscricao" | "mfa_verificacao"
  | "recuperacao_pedida" | "recuperacao_envio_falhou" | "recuperacao_confirmada"
  | "senha_trocada" | "convite_gerado"
  | "cliente_criado" | "cliente_suspenso" | "cliente_reativado" | "cliente_excluido"
  | "bar_renomeado" | "interessado_atualizado" | "manutencao" | "limpeza_r2"
  | "pagamento_registrado" | "pagamento_removido" | "item_removido"
  | "comanda_fechada" | "comanda_reaberta" | "produto_removido";

const RETENCAO = "2 years";

export async function auditar(acao: AcaoAuditada, dados: {
  ator?: string | null; alvo?: string | null; ok: boolean; detalhe?: string;
  client?: PoolClient;
}): Promise<void> {
  try {
    let ipHash: string | null = null;
    try { ipHash = await hashDoIpAtual(); } catch { ipHash = null; }
    const insert = (db: PoolClient | typeof neonPool) => db.query(
      `INSERT INTO app_private.audit_log (actor_id, action, target_id, ok, detail, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [dados.ator ?? null, acao, dados.alvo ?? null, dados.ok,
        dados.detalhe?.slice(0, 200) ?? null, ipHash],
    );
    if (dados.client) {
      // Inside the caller's transaction a failed INSERT would abort it; the
      // savepoint confines the failure to the audit row.
      await dados.client.query("SAVEPOINT auditoria");
      try {
        await insert(dados.client);
        await dados.client.query("RELEASE SAVEPOINT auditoria");
      } catch (erro) {
        await dados.client.query("ROLLBACK TO SAVEPOINT auditoria");
        throw erro;
      }
    } else {
      await insert(neonPool);
    }
    // Retenção sem agendador: uma varredura barata a cada ~200 registros.
    if (!dados.client && Math.random() < 0.005) {
      await neonPool.query(
        `DELETE FROM app_private.audit_log WHERE created_at < now() - interval '${RETENCAO}'`);
      await neonPool.query(
        "DELETE FROM app_private.auth_rate_limits WHERE window_start < now() - interval '1 day'");
    }
  } catch (erro) {
    console.error("[auditoria] registro falhou", acao, erro);
  }
}
