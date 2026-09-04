"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { parseReaisParaCentavos } from "@/lib/format";
import type { EstadoForm } from "@/app/actions/auth";

export async function criarProduto(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const precoBruto = String(formData.get("preco") ?? "").trim();
  const imagemUrl = String(formData.get("imagem_url") ?? "").trim();

  if (nome.length < 2) return { ok: false, mensagem: "Digite o nome do produto." };

  const precoCentavos = parseReaisParaCentavos(precoBruto);
  if (precoCentavos === null) return { ok: false, mensagem: "Preço inválido." };

  const { supabase, bar } = await exigirBar();

  const { error } = await supabase.from("produtos").insert({
    bar_id: bar.id,
    nome,
    preco_centavos: precoCentavos,
    imagem_url: imagemUrl || null,
  });

  if (error) return { ok: false, mensagem: "Não consegui salvar o produto." };

  revalidatePath("/produtos");
  redirect("/produtos");
}

export async function removerProduto(produtoId: string) {
  const { supabase } = await exigirBar();
  await supabase.from("produtos").delete().eq("id", produtoId);
  revalidatePath("/produtos");
}
