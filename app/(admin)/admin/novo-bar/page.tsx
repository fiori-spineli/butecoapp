import { redirect } from "next/navigation";
import { getNeonSession } from "@/lib/neon-session";

export const dynamic = "force-dynamic";

export default async function NovoBarPage() {
  const session = await getNeonSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/dashboard");

  // Cadastro administrativo depende de MFA e operações ainda não migradas.
  redirect("/admin");
}
