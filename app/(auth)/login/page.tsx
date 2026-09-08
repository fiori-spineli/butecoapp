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
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10 md:max-w-md">
      <div className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-500">
          ButecoApp
        </p>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-stone-900">
          Acesso do Bar
        </h1>
        <p className="mx-auto mt-2 max-w-[32ch] text-sm text-stone-500">
          Entre com link direto no e-mail ou use sua senha cadastrada.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
        <LoginForm erroInicial={erro} />
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-stone-400">
        Área restrita ao dono do bar. Clientes acompanham o consumo escaneando o QR Code na mesa.
      </p>
    </main>
  );
}