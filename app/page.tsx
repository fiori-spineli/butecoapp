import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { Vitrine } from "@/components/vitrine";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ButecoApp — a comanda digital do bar de bairro",
  description:
    "Abra a mesa, anote o pedido com um toque e deixe o cliente conferir a conta pelo QR Code. Sem ficha de papel e sem conta somada errada no fim da noite.",
  openGraph: {
    title: "ButecoApp — a comanda digital do bar de bairro",
    description:
      "A comanda de papel molha, some e é somada com pressa. O ButecoApp faz essa conta no celular, e o cliente acompanha pelo QR Code.",
    type: "website",
    locale: "pt_BR",
  },
};

/**
 * A raiz tem dois papéis.
 *
 * Para quem já usa o sistema ela é um cruzamento: manda o admin para /admin, o
 * dono sem bar para /onboarding e o resto para /dashboard.
 *
 * Para quem chega de fora ela é a vitrine — e essa é a mudança. Antes, visitante
 * sem sessão era redirecionado para /login, ou seja, a primeira coisa que o
 * mundo via do ButecoApp era um campo de senha.
 */
export default async function Home() {
  if (!supabaseConfigurado()) return <Vitrine />;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <Vitrine />;

  // 1. Verifica se é Super Admin
  const { data: admin } = await supabase
    .from("administradores")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (admin) {
    redirect("/admin");
  }

  // 2. Se não for admin, verifica se tem bar
  const { data: bar } = await supabase
    .from("bars")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!bar) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
