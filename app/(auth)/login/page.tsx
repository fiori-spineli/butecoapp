import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { loginComGoogleDisponivel } from "@/lib/provedores";
import { LoginForm } from "./login-form";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";
import { FundoChopp } from "@/components/fundo-chopp";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const mostrarGoogle = await loginComGoogleDisponivel();

  if (supabaseConfigurado()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: admin } = await supabase
        .from("administradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (admin) {
        redirect("/admin");
      }

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
      <div className="absolute top-5 left-5 z-20">
        <Link
          href="/"
          className="cursor-pointer inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-300 dark:border-stone-700 bg-white/80 dark:bg-stone-800/80 px-4 text-xs font-semibold text-stone-700 dark:text-stone-300 backdrop-blur-md shadow-xs transition-colors hover:border-amber-600 dark:hover:border-amber-500"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="hidden sm:inline">Sobre o sistema</span>
          <span className="sm:hidden">Voltar</span>
        </Link>
      </div>

      <div className="absolute top-5 right-5 z-20">
        <TemaToggle />
      </div>

      {/* LADO ESQUERDO: Painel com Fundo de Cerveja e Logo em Destaque */}
      <section className="hidden md:flex md:col-span-5 lg:col-span-6 relative flex-col justify-between p-10 lg:p-16 border-r border-amber-900/30 bg-linear-to-br from-stone-950 via-amber-950/85 to-stone-950 text-stone-100 overflow-hidden">
        <FundoChopp />

        {/* Topo: Logo Grande no Desktop */}
        <div className="relative z-10 flex items-center">
          <LogoButeco className="w-64 lg:w-80 h-24 lg:h-32" priority />
        </div>

        {/* Chamada Principal */}
        <div className="relative z-10 my-auto max-w-md py-6">
          <span className="inline-block px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-[11px] font-black text-amber-300 uppercase tracking-widest mb-4">
            Painel do Balcão
          </span>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
            Comandas ágeis e sem complicação.
          </h1>
          <p className="mt-4 text-sm lg:text-base leading-relaxed text-stone-300">
            Abra mesas, anote pedidos com um toque e faça divisões de conta direto no celular. Seus clientes acompanham o consumo pelo QR Code em tempo real.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-amber-900/40 pt-6">
            <div>
              <p className="text-xl font-bold text-amber-400">100% Digital</p>
              <p className="text-xs text-stone-400 mt-1">
                Sem fichas molhadas ou comandas perdidas.
              </p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-400">Sem Cadastro</p>
              <p className="text-xs text-stone-400 mt-1">
                O cliente só aponta a câmera e confere a conta.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé com Links */}
        <div className="relative z-10 flex flex-col gap-2 text-xstext-stone-400 pt-5">
          <div className="flex items-center gap-4">
            <Link
              href="https://www.linkedin.com/in/samuel-spineli/"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer hover:text-white transition-colors"
            >
              Samuel Spineli
            </Link>
            <span>&bull;</span>
            <Link
              href="https://www.linkedin.com/in/lucas-fiori/"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer hover:text-white transition-colors"
            >
              Lucas Fiori
            </Link>
          </div>
          <p className="text-[11px] text-stone-500">
            ButecoApp &copy; {new Date().getFullYear()}
          </p>
        </div>
      </section>

      {/* LADO DIREITO: Formulário */}
      {/* pt-24 no celular: o "Sobre o sistema" e o tema flutuam no topo e
          passariam por cima da logo com o padding padrão. */}
      <section className="md:col-span-7 lg:col-span-6 flex flex-col justify-center items-center px-5 pt-24 pb-12 md:py-12 lg:px-16">
        <div className="w-full max-w-md">
          {/* Logo no Mobile */}
          <div className="md:hidden flex flex-col items-center mb-6">
            <LogoButeco className="w-48 h-16 mb-1" priority />
            <h2 className="text-lg font-black tracking-tight text-stone-900 dark:text-stone-100">
              Acesso do Bar
            </h2>
          </div>

          <div className="hidden md:block mb-6">
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight">
              Entrar no sistema
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {mostrarGoogle
                ? "Acesse as comandas do seu bar com a conta Google ou com e-mail e senha."
                : "Acesse as comandas do seu bar com e-mail e senha."}
            </p>
          </div>

          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 md:p-8 shadow-xs">
            <LoginForm erroInicial={erro} mostrarGoogle={mostrarGoogle} />
          </div>

          <div className="mt-6 flex flex-col items-center gap-1.5 text-center text-xs text-stone-500 dark:text-stone-400">
            <p>Área restrita ao administrador do bar.</p>
            <div className="flex items-center gap-2.5 pt-1">
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