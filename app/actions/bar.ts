"use server";

import { redirect } from "next/navigation";
import { contextoDoDono, gerarSlug } from "@/lib/bar";
import type { EstadoForm } from "@/app/actions/auth";

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
