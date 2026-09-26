import { redirect } from "next/navigation";
import Link from "next/link";
import { getNeonSession } from "@/lib/neon-session";
import { NovoBarForm } from "./novo-bar-form";

export const dynamic = "force-dynamic";

export default async function NovoBarPage() {
  const session = await getNeonSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) redirect("/dashboard");
  if (!session.mfaVerified) redirect("/admin");
  return <main className="min-h-screen bg-stone-100 p-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="text-sm text-amber-700">← Voltar ao painel</Link>
      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 dark:border-stone-800 dark:bg-stone-900">
        <h1 className="mb-6 text-2xl font-black">Criar conta de dono de bar</h1>
        <NovoBarForm />
      </section>
    </div>
  </main>;
}
