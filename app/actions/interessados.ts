"use server";

import { revalidatePath } from "next/cache";
import { exigirAdminVerificado } from "@/app/actions/admin";
import { criarClienteDoPedido } from "@/app/actions/clientes";
import { listarInteressadosNoNeon, mudarStatusInteresse } from "@/lib/neon/interessados";
import type { EstadoForm } from "@/app/actions/auth";
import type { Interessado } from "@/lib/types";

const NEGADO: EstadoForm = {
  ok: false,
  mensagem: "Acesso negado. Valide o segundo fator de administrador.",
};

export async function listarInteressados(): Promise<Interessado[]> {
  if (!(await exigirAdminVerificado())) return [];
  return listarInteressadosNoNeon();
}

export async function criarContaDoBar(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  if (!(await exigirAdminVerificado())) return NEGADO;
  const id = String(formData.get("interessado_id") ?? "").trim();
  const nome = String(formData.get("bar_nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!id || !nome || !email) return { ok: false, mensagem: "Faltou o nome do bar ou o e-mail." };
  return criarClienteDoPedido(id, nome, email);
}

export async function mudarStatusInteressado(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  if (!(await exigirAdminVerificado())) return NEGADO;
  const id = String(formData.get("interessado_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["novo", "contatado", "descartado"].includes(status) ||
      observacao.length > 2000) return { ok: false, mensagem: "Dados inválidos." };
  if (!(await mudarStatusInteresse(id, status, observacao))) {
    return { ok: false, mensagem: "Pedido não encontrado ou já convertido em cliente." };
  }
  revalidatePath("/admin");
  return { ok: true, mensagem: "Pedido atualizado." };
}
