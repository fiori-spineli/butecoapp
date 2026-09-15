"use server";

import { revalidatePath } from "next/cache";
import { exigirBar, gerarSlug } from "@/lib/bar";
import type { EstadoForm } from "@/app/actions/auth";
import { LIMITE_DE_CARACTERES } from "@/lib/mensagem-qr";

/**
 * Salva a mensagem que acompanha o link da comanda no WhatsApp.
 *
 * Campo vazio grava `null` de propósito: significa "quero o padrão", e o
 * padrão fica num lugar só (lib/mensagem-qr.ts). Se gravássemos o texto
 * padrão em cada bar, mudar a redação depois exigiria migrar todas as linhas.
 */
export async function salvarMensagemQr(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const bruta = String(formData.get("mensagem") ?? "").trim();

  if (bruta.length > LIMITE_DE_CARACTERES) {
    return {
      ok: false,
      mensagem: `A mensagem pode ter até ${LIMITE_DE_CARACTERES} caracteres. A sua tem ${bruta.length}.`,
    };
  }

  const { supabase, bar } = await exigirBar();

  const { error } = await supabase
    .from("bars")
    .update({ mensagem_qr: bruta || null })
    .eq("id", bar.id);

  if (error) {
    return { ok: false, mensagem: "Não consegui salvar a mensagem. Tente de novo." };
  }

  revalidatePath("/perfil");
  revalidatePath("/comanda", "layout");

  return {
    ok: true,
    mensagem: bruta
      ? "Mensagem salva. É ela que o cliente vai receber junto com o link."
      : "Voltamos para a mensagem padrão.",
  };
}

/**
 * Atualiza as configurações gerais do bar (nome, horários, telefone, cidade).
 */
export async function atualizarConfiguracoesBar(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const horarioAbertura = String(formData.get("horario_abertura") ?? "18:00").trim();
  const horarioFechamento = String(formData.get("horario_fechamento") ?? "03:00").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();

  if (nome.length < 2) {
    return { ok: false, mensagem: "O nome do bar precisa ter ao menos 2 caracteres." };
  }

  const { supabase, bar } = await exigirBar();

  const { error } = await supabase
    .from("bars")
    .update({
      nome,
      horario_abertura: horarioAbertura || "18:00:00",
      horario_fechamento: horarioFechamento || "03:00:00",
      telefone: telefone || null,
      cidade: cidade || null,
      slug: gerarSlug(nome),
    })
    .eq("id", bar.id);

  if (error) {
    return { ok: false, mensagem: "Não foi possível salvar as configurações. Tente de novo." };
  }

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  revalidatePath("/relatorios");

  return { ok: true, mensagem: "Configurações do bar atualizadas com sucesso!" };
}