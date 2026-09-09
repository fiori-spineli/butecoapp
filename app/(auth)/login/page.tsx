import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
import { TemaToggle } from "@/components/tema-toggle";

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
    <main className="relative mx-auto flex min-h-dvh w-full max-w-sm md:max-w-md flex-col justify-center px-5 py-8 md:py-12">
      {/* Botão de Tema no Topo */}
      <div className="absolute top-5 right-5">
        <TemaToggle />
      </div>

      {/* Cabeçalho com a Logo Oficial */}
      <div className="mb-6 text-center flex flex-col items-center">
        <div className="relative size-16 md:size-20 mb-3">
          <Image
            src="/buteco_logo.webp"
            alt="Logo ButecoApp"
            fill
            priority
            className="object-contain drop-shadow-sm"
          />
        </div>

        <p className="text-xs font-extrabold uppercase tracking-[0.25em] text-amber-800 dark:text-amber-500">
          ButecoApp
        </p>
        <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
          Caderninho de Comandas
        </h1>
        <p className="mx-auto mt-2 max-w-[32ch] text-xs md:text-sm text-stone-600 dark:text-stone-400">
          Abra o consumo de mesas e clientes direto no celular.
        </p>
      </div>

      {/* Card Principal de Autenticação */}
      <div className="rounded-3xl border border-stone-300/80 dark:border-stone-800 bg-white/90 dark:bg-stone-900/80 p-6 md:p-8 shadow-xl shadow-stone-900/5 dark:shadow-black/40 backdrop-blur-md">
        <LoginForm erroInicial={erro} />
      </div>

      {/* Rodapé */}
      <footer className="mt-7 text-center">
        <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-500">
          Acesso restrito ao dono do bar. <br className="hidden sm:inline" />
          Clientes da mesa acompanham o consumo sem login pelo QR Code.
        </p>
      </footer>
    </main>
  );
}