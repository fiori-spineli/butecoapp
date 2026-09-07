import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  if (supabaseConfigurado()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-7 py-10">
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
        ButecoApp
      </p>
      <h1 className="text-center text-3xl font-bold tracking-tight">Entrar</h1>
      <p className="mx-auto mt-2.5 mb-7 max-w-[30ch] text-center text-sm leading-relaxed text-stone-500">
        Digite seu e-mail. A gente manda um link de acesso — sem senha pra lembrar.
      </p>

      <LoginForm erroInicial={erro} />

      <p className="mt-7 text-center text-xs leading-relaxed text-stone-400">
        Só o dono do bar faz login. Clientes acessam a própria conta por link, sem cadastro.
      </p>
    </main>
  );
}
