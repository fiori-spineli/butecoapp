"use server";

import { revalidatePath } from "next/cache";
import { exigirAdminVerificado } from "@/app/actions/admin";
import { neonPool } from "@/lib/neon-db";
import { gerarSlug } from "@/lib/bar";
import { analisarEmail, MENSAGEM_DESCARTAVEL } from "@/lib/email-descartavel";
import { createInviteLink } from "@/lib/neon/recovery";
import { revokeUserSessions } from "@/lib/neon-session";
import { listarObjetos, apagarObjeto } from "@/lib/r2";
import { auditar } from "@/lib/auditoria";
import type { EstadoForm } from "@/app/actions/auth";

const NEGADO: EstadoForm = { ok: false, mensagem: "Acesso negado. Valide o segundo fator de administrador." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validar(nome: string, emailInput: string): { email: string; error: string | null } {
  if (nome.length < 2 || nome.length > 120) return { email: "", error: "O nome do bar deve ter entre 2 e 120 caracteres." };
  const { email, problema } = analisarEmail(emailInput);
  return { email, error: problema === "formato" ? "Digite um e-mail válido." :
    problema === "descartavel" ? MENSAGEM_DESCARTAVEL : null };
}

async function provisionar(nome: string, email: string, interessadoId?: string):
  Promise<{ ok: true; barId: string; userId: string } | { ok: false; mensagem: string }> {
  const client = await neonPool.connect();
  try {
    await client.query("BEGIN");
    if (interessadoId) {
      const lead = await client.query<{ status: string; bar_id: string | null }>(
        "SELECT status, bar_id FROM public.interessados WHERE id = $1 FOR UPDATE", [interessadoId]);
      if (!lead.rows[0] || lead.rows[0].bar_id || lead.rows[0].status === "convertido") {
        await client.query("ROLLBACK");
        return { ok: false, mensagem: "Pedido já convertido ou inexistente." };
      }
    }
    const user = await client.query<{ id: string }>(
      `INSERT INTO public.users(email, password_hash) VALUES ($1, NULL)
       ON CONFLICT DO NOTHING RETURNING id`, [email]);
    let userId = user.rows[0]?.id;
    if (!userId) {
      const existing = await client.query<{ id: string; occupied: boolean }>(
        `SELECT u.id, EXISTS(SELECT 1 FROM public.bars b WHERE b.owner_id=u.id)
          OR EXISTS(SELECT 1 FROM public.administradores a WHERE a.user_id=u.id) AS occupied
         FROM public.users u WHERE lower(u.email)=$1 FOR UPDATE`, [email]);
      if (!existing.rows[0] || existing.rows[0].occupied) {
        await client.query("ROLLBACK");
        return { ok: false, mensagem: "Este e-mail já pertence a uma conta com acesso." };
      }
      userId = existing.rows[0].id;
    }
    const bar = await client.query<{ id: string }>(
      "INSERT INTO public.bars(owner_id,nome,slug) VALUES ($1,$2,$3) RETURNING id",
      [userId, nome, gerarSlug(nome)]);
    if (interessadoId) await client.query(
      `UPDATE public.interessados SET status='convertido', bar_id=$1, atendido_em=now()
       WHERE id=$2`, [bar.rows[0].id, interessadoId]);
    await client.query("COMMIT");
    return { ok: true, barId: bar.rows[0].id, userId };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[admin] provisionamento falhou", error);
    return { ok: false, mensagem: "Não consegui criar a conta. Nenhuma alteração parcial foi salva." };
  } finally { client.release(); }
}

async function criar(ator: string, nome: string, emailInput: string,
  interessadoId?: string): Promise<EstadoForm> {
  const { email, error } = validar(nome, emailInput);
  if (error) return { ok: false, mensagem: error };
  const result = await provisionar(nome, email, interessadoId);
  await auditar("cliente_criado", { ator, alvo: result.ok ? result.userId : null, ok: result.ok });
  if (!result.ok) return { ok: false, mensagem: result.mensagem };
  try {
    const link = await createInviteLink(result.userId, email);
    await auditar("convite_gerado", { ator, alvo: result.userId, ok: true });
    revalidatePath("/admin");
    return { ok: true, mensagem: `Bar "${nome}" criado. Envie este convite para o dono definir a senha: ${link}` };
  } catch (error) {
    console.error("[admin] convite falhou", error);
    revalidatePath("/admin");
    return { ok: true, mensagem: `Bar "${nome}" criado. O convite falhou; gere um novo na lista de clientes.` };
  }
}

export async function criarClienteDoZero(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await exigirAdminVerificado();
  if (!admin) return NEGADO;
  return criar(admin.userId, String(formData.get("bar_nome") ?? "").trim(),
    String(formData.get("email") ?? ""));
}

export async function criarClienteManual(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await exigirAdminVerificado();
  if (!admin) return NEGADO;
  if (String(formData.get("senha") ?? "")) return { ok: false,
    mensagem: "A senha deve ser definida pelo dono no convite. Deixe o campo de senha vazio." };
  return criar(admin.userId, String(formData.get("bar_nome") ?? "").trim(),
    String(formData.get("email") ?? ""));
}

export async function criarClienteDoPedido(id: string, nome: string, email: string): Promise<EstadoForm> {
  const admin = await exigirAdminVerificado();
  if (!admin) return NEGADO;
  if (!UUID.test(id)) return { ok: false, mensagem: "Pedido inválido." };
  return criar(admin.userId, nome.trim(), email, id);
}

export async function renomearBar(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await exigirAdminVerificado();
  if (!admin) return NEGADO;
  const id = String(formData.get("bar_id") ?? "");
  const nome = String(formData.get("bar_nome") ?? "").trim();
  if (!UUID.test(id) || nome.length < 2 || nome.length > 120) return { ok: false, mensagem: "Dados inválidos." };
  const result = await neonPool.query("UPDATE public.bars SET nome=$1 WHERE id=$2", [nome, id]);
  await auditar("bar_renomeado", { ator: admin.userId, alvo: id, ok: !!result.rowCount });
  if (!result.rowCount) return { ok: false, mensagem: "Bar não encontrado." };
  revalidatePath("/admin");
  return { ok: true, mensagem: `Bar renomeado para "${nome}".` };
}

export async function alternarSuspensao(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await exigirAdminVerificado();
  if (!admin) return NEGADO;
  const ownerId = String(formData.get("owner_id") ?? "");
  if (!UUID.test(ownerId)) return { ok: false, mensagem: "Dono inválido." };
  const suspender = String(formData.get("suspender") ?? "") === "1";
  // One transaction: the flag and the revocation land together or not at all.
  // They used to be two commands, and a failure between them left a suspended
  // owner whose old tokens came back to life on reactivation. Reactivating
  // revokes too, so nothing issued before the suspension survives it.
  const client = await neonPool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE public.users SET suspended_at = CASE WHEN $1 THEN now() ELSE NULL END
        WHERE id=$2 AND EXISTS(SELECT 1 FROM public.bars WHERE owner_id=$2)`, [suspender, ownerId]);
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, mensagem: "Dono não encontrado." };
    }
    await revokeUserSessions(client, ownerId);
    await auditar(suspender ? "cliente_suspenso" : "cliente_reativado",
      { ator: admin.userId, alvo: ownerId, ok: true, client });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[admin] suspensão falhou", error);
    return { ok: false, mensagem: "Não consegui alterar o acesso. Nada foi mudado." };
  } finally { client.release(); }
  revalidatePath("/admin");
  return { ok: true, mensagem: suspender ? "Acesso suspenso; dados preservados." : "Acesso reativado." };
}

export async function gerarLinkDeAcesso(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await exigirAdminVerificado();
  if (!admin) return NEGADO;
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));
  if (problema) return { ok: false, mensagem: "E-mail inválido." };
  const { rows } = await neonPool.query<{ id: string }>(
    `SELECT u.id FROM public.users u JOIN public.bars b ON b.owner_id=u.id
      WHERE lower(u.email)=$1 LIMIT 1`, [email]);
  if (!rows[0]) return { ok: false, mensagem: "Cliente não encontrado." };
  try {
    const link = await createInviteLink(rows[0].id, email);
    await auditar("convite_gerado", { ator: admin.userId, alvo: rows[0].id, ok: true });
    return { ok: true, mensagem: link };
  } catch {
    await auditar("convite_gerado", { ator: admin.userId, alvo: rows[0].id, ok: false });
    return { ok: false, mensagem: "Não consegui gerar o convite agora." };
  }
}

export async function excluirCliente(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const admin = await exigirAdminVerificado();
  if (!admin) return NEGADO;
  const barId = String(formData.get("bar_id") ?? "");
  const ownerId = String(formData.get("owner_id") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "").trim();
  if (!UUID.test(barId) || !UUID.test(ownerId)) return { ok: false, mensagem: "Cliente inválido." };
  const client = await neonPool.connect();
  let nome = "";
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ nome: string }>(
      "SELECT nome FROM public.bars WHERE id=$1 AND owner_id=$2 FOR UPDATE", [barId, ownerId]);
    nome = rows[0]?.nome ?? "";
    if (!nome || nome.toLocaleLowerCase("pt-BR") !== confirmacao.toLocaleLowerCase("pt-BR")) {
      await client.query("ROLLBACK");
      return { ok: false, mensagem: "Digite exatamente o nome atual do bar para confirmar." };
    }
    // Cascade radius (GUARDRAILS §1): users -> bars -> clientes, produtos ->
    // lancamentos, pagamentos, pedidos_pendentes; sessions, mfa_factors and
    // password_recovery go too; interessados.bar_id is SET NULL. The audit row
    // keeps only ids, so it survives the cascade by design.
    await client.query("DELETE FROM public.users WHERE id=$1", [ownerId]);
    await auditar("cliente_excluido", { ator: admin.userId, alvo: ownerId, ok: true,
      detalhe: `bar ${barId}`, client });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[admin] exclusão falhou", error);
    return { ok: false, mensagem: "Não consegui excluir a conta. Nenhum dado foi removido." };
  } finally { client.release(); }
  let limpezaFalhou = false;
  try {
    for (const prefix of [`produtos/${barId}/`, `logos/${barId}/`]) {
      for (const object of await listarObjetos(prefix)) await apagarObjeto(object.key);
    }
  } catch (error) {
    limpezaFalhou = true;
    console.error("[admin] limpeza R2 após exclusão falhou", error);
  }
  revalidatePath("/admin");
  return { ok: true, mensagem: limpezaFalhou
    ? `"${nome}" e os dados do banco foram excluídos. Verifique fotos órfãs no R2.`
    : `"${nome}" e seus dados foram excluídos.` };
}
