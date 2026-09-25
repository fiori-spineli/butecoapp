import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Vitrine } from "@/components/vitrine";
import { origemDoApp } from "@/lib/url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ButecoApp — a comanda digital do bar de bairro",
  description:
    "Abra a mesa, anote o pedido com um toque e deixe o cliente conferir a conta pelo QR Code. Sem ficha de papel e sem conta somada errada no fim da noite.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("buteco_session")?.value;

  // Se não tem cookie de sessão, mostra a vitrine pública para visitantes
  if (!token) {
    return <Vitrine />;
  }

  try {
    // Decodifica o payload do JWT para identificar o usuário sem requisições extras
    const payloadBase64 = token.split(".")[1];
    const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
    const dados = JSON.parse(payloadJson);

    // 1. Se for Super Admin, redireciona direto para o painel de admin
    if (dados.is_admin) {
      redirect("/admin");
    }

    // 2. Se for Dono de Bar, confere se já possui bar cadastrado
    const base = await origemDoApp();
    const resBar = await fetch(`${base}/api/bar/config`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (resBar.ok) {
      const bar = await resBar.json();
      if (bar && bar.id) {
        redirect("/dashboard");
      }
    }

    // Se estiver logado mas ainda não tiver bar vinculado
    redirect("/onboarding");
  } catch (err) {
    // Se o token estiver corrompido ou vencido, exibe a vitrine
    return <Vitrine />;
  }
}