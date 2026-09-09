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
    <main className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-stone-100 dark:bg-stone-950 transition-colors">
      {/* Botão de Tema flutuante no topo direito */}
      <div className="absolute top-6 right-6 z-20">
        <TemaToggle />
      </div>

      {/* LADO ESQUERDO: Painel de Apresentação (Apenas Desktop / lg:) */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-stone-900 via-stone-950 to-amber-950 text-stone-100 overflow-hidden border-r border-stone-800">
        {/* Detalhe sutil de iluminação ambiente no fundo */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-amber-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 size-96 rounded-full bg-amber-700/10 blur-3xl pointer-events-none" />

        {/* Topo do painel */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative size-12">
            <Image
              src="/buteco_logo.webp"
              alt="ButecoApp"
              fill
              priority
              className="object-contain"
            />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-500">
              ButecoApp
            </span>
            <p className="text-sm font-semibold text-stone-400">
              O caderninho do bar, no celular
            </p>
          </div>
        </div>

        {/* Centro: Chamada de Produto */}
        <div className="relative z-10 my-auto max-w-lg">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">
            Painel do Estabelecimento
          </span>
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight text-stone-100">
            Abra a conta da mesa em segundos.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-stone-300">
            Controle consumo, divisões e encerramentos com rapidez no meio do movimento.
            Seus clientes acompanham tudo em tempo real pelo QR Code, sem precisar baixar aplicativo.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-stone-800/80 pt-8">
            <div>
              <p className="text-2xl font-bold text-amber-400">100% Digital</p>
              <p className="text-xs text-stone-400 mt-1">
                Adeus fichas de papel molhadas e comandas perdidas.
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-400">Zero atrito</p>
              <p className="text-xs text-stone-400 mt-1">
                Cliente lê com a câmera e confere a conta na hora.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do painel */}
        <div className="relative z-10 text-xs text-stone-500">
          ButecoApp &copy; {new Date().getFullYear()} &mdash; Simplicidade para quem está atrás do balcão.
        </div>
      </div>

      {/* LADO DIREITO: Área do Formulário (Mobile + Desktop) */}
      <div className="lg:col-span-7 xl:col-span-6 flex flex-col justify-center items-center px-6 py-12 md:px-12 xl:px-20">
        <div className="w-full max-w-md">
          {/* Cabeçalho mobile (oculto no desktop) */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <div className="relative size-16 mb-2">
              <Image
                src="/buteco_logo.webp"
                alt="ButecoApp"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-700 dark:text-amber-500">
              ButecoApp
            </span>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              Acesso ao Bar
            </h2>
          </div>

          {/* Título Desktop */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              Entrar no sistema
            </h2>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Acesse suas comandas por link direto no e-mail ou com senha.
            </p>
          </div>

          {/* Card do Formulário */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800/80 bg-white dark:bg-stone-900/70 p-6 md:p-8 shadow-sm backdrop-blur-sm">
            <LoginForm erroInicial={erro} />
          </div>

          <p className="mt-6 text-center text-xs text-stone-500 dark:text-stone-500">
            Acesso exclusivo para administradores do bar.
          </p>
        </div>
      </div>
    </main>
  );
}