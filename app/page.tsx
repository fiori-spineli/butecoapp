import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!supabaseConfigurado()) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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