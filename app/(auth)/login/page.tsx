import Image from "next/image";
import Link from "next/link";
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

    if (user) {
      // Checa se o bar realmente existe antes de mandar pro dashboard
      const { data: bar } = await supabase
        .from("bars")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (bar) {
        redirect("/dashboard");
      } else {
        redirect("/onboarding");
      }
    }
  }

  return (
    <main className="min-h-screen w-full grid grid-cols-1 md:grid-cols-12 bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <div className="absolute top-5 right-5 z-20">
        <TemaToggle />
      </div>

      {/* LADO ESQUERDO: Apresentação Desktop */}
      <section className="hidden md:flex md:col-span-5 lg:col-span-6 relative flex-col justify-between p-10 lg:p-16 border-r border-stone-200 dark:border-stone-800 bg-stone-200/50 dark:bg-stone-900/40">
        <div className="flex items-center gap-3">
          <div className="relative size-12 shrink-0">
            <Image
              src="/buteco_logo.png"
              alt="ButecoApp"
              fill
              priority
              className="object-contain"
            />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-700 dark:text-amber-500">
              ButecoApp
            </span>
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
              O caderninho do bar, no celular
            </p>
          </div>
        </div>

        <div className="my-auto max-w-md py-12">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-4">
            Acesso do Estabelecimento
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-stone-900 dark:text-stone-100">
            Comandas ágeis e sem complicação.
          </h1>
          <p className="mt-4 text-sm lg:text-base leading-relaxed text-stone-600 dark:text-stone-400">
            Abra mesas, anote pedidos tocando nos produtos e faça divisões de conta direto no celular. Seus clientes acompanham o consumo pelo QR Code em tempo real.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-stone-300 dark:border-stone-800 pt-6">
            <div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-500">100% Digital</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                Sem fichas molhadas ou comandas perdidas.
              </p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-500">Sem Cadastro</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                O cliente só aponta a câmera e confere a conta.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé Desktop com Créditos */}
        <div className="flex flex-col gap-2 text-xs text-stone-500 dark:text-stone-400 border-t border-stone-300/60 dark:border-stone-800/80 pt-4">
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/fiori-spineli"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100 transition-colors inline-flex items-center gap-1.5 font-medium"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              fiori-spineli
            </Link>
            <span>&bull;</span>
            <Link
              href="https://www.linkedin.com/in/samuel-spineli/"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Samuel Spineli
            </Link>
            <span>&bull;</span>
            <Link
              href="https://www.linkedin.com/in/lucas-fiori/"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Lucas Fiori
            </Link>
          </div>
          <p className="text-[11px] text-stone-400 dark:text-stone-600">
            ButecoApp &copy; {new Date().getFullYear()}
          </p>
        </div>
      </section>

      {/* LADO DIREITO: Formulário */}
      <section className="md:col-span-7 lg:col-span-6 flex flex-col justify-center items-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">
          <div className="md:hidden flex flex-col items-center text-center mb-8">
            <div className="relative size-16 mb-2">
              <Image
                src="/buteco_logo.png"
                alt="ButecoApp"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-700 dark:text-amber-500">
              ButecoApp
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Acesso do Bar
            </h2>
          </div>

          <div className="hidden md:block mb-8">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight">
              Entrar no sistema
            </h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              Acesse suas comandas por link direto no e-mail ou com senha.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
            <LoginForm erroInicial={erro} />
          </div>

          <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-stone-500 dark:text-stone-400">
            <p>Área restrita ao administrador do bar.</p>
            <div className="flex items-center gap-2.5 pt-2">
              <Link
                href="https://github.com/fiori-spineli"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer hover:underline"
              >
                GitHub
              </Link>
              <span>&bull;</span>
              <Link
                href="https://www.linkedin.com/in/samuel-spineli/"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer hover:underline"
              >
                Samuel
              </Link>
              <span>&bull;</span>
              <Link
                href="https://www.linkedin.com/in/lucas-fiori/"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer hover:underline"
              >
                Lucas
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}