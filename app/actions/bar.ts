"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contextoDoDono, exigirBar, gerarSlug } from "@/lib/bar";
import type { EstadoForm } from "@/app/actions/auth";
import { LIMITE_DE_CARACTERES } from "@/lib/mensagem-qr";

export async function criarBar(_anterior: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();

  if (nome.length < 2) {
    return { ok: false, mensagem: "Digite o nome do bar." };
  }

  const { supabase, user, bar } = await contextoDoDono();
  if (bar) redirect("/dashboard");

  const { error } = await supabase
    .from("bars")
    .insert({ owner_id: user.id, nome, slug: gerarSlug(nome) });

  if (error) {
    return { ok: false, mensagem: "Não consegui criar o bar agora. Tente de novo." };
  }

  redirect("/dashboard");
}

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
