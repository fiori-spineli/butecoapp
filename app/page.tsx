import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Vitrine } from "@/components/vitrine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ButecoApp — a comanda digital do bar de bairro",
  description:
    "Abra a mesa, anote o pedido com um toque e deixe o cliente conferir a conta pelo QR Code. Sem ficha de papel e sem conta somada errada no fim da noite.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("buteco_session")?.value;

  // 1. Se não tem sessão, exibe a Vitrine imediatamente
  if (!token) {
    return <Vitrine />;
  }

  let destino: string | null = null;

  // 2. Lê os dados do token sem colocar redirect() dentro do try/catch
  try {
    const payloadJson = Buffer.from(token, "base64url").toString("utf-8");
    const dados = JSON.parse(payloadJson);

    if (dados.is_admin) {
      destino = "/admin";
    } else {
      destino = "/dashboard";
    }
  } catch (err) {
    // Se o token estiver corrompido, limpa e exibe a vitrine
    return <Vitrine />;
  }

  // 3. O redirect DEVE ser chamado fora do try/catch no Next.js:
  if (destino) {
    redirect(destino);
  }

  return <Vitrine />;
}