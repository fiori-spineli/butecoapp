import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Vitrine } from "@/components/vitrine";
import { getNeonSession } from "@/lib/neon-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ButecoApp — a comanda digital do bar de bairro",
  description:
    "Abra a mesa, anote o pedido com um toque e deixe o cliente conferir a conta pelo QR Code. Sem ficha de papel e sem conta somada errada no fim da noite.",
};

export default async function Home() {
  const session = await getNeonSession();
  if (!session) return <Vitrine />;
  redirect(session.isAdmin ? "/admin" : "/dashboard");
}
