"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { origemDoApp } from "@/lib/url";

export type EstadoForm = { ok: boolean; mensagem: string } | null;

export async function enviarMagicLink(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { ok: false, mensagem: "Digite um e-mail válido." };
  }

  if (!supabaseConfigurado()) {
    return {
      ok: false,
      mensagem: "Supabase ainda não configurado — preencha o .env.local (veja o README).",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origemDoApp()}/auth/callback` },
  });

  if (error) {
    // O SMTP embutido do Supabase entrega poucos e-mails por hora, e o limite é
    // por projeto — insistir só queima o que sobrou da cota. Vale dizer isso em
    // vez de mandar "tente de novo".
    const excedeuCota =
      error.status === 429 || error.code === "over_email_send_rate_limit";

    return {
      ok: false,
      mensagem: excedeuCota
        ? "Limite de e-mails do projeto atingido. Espere alguns minutos antes de pedir outro link — tentar de novo agora não adianta."
        : "Não consegui enviar o link agora. Tente de novo.",
    };
  }

  return {
    ok: true,
    mensagem: `Link enviado para ${email}. Abra o e-mail e toque no link para entrar.`,
  };
}

export async function sair() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
