import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { contextoDoDono } from "@/lib/bar";
import { TemaToggle } from "@/components/tema-toggle";
import { BotaoSair } from "@/components/botao-sair";
import { LogoButeco } from "@/components/logo-buteco";

export const dynamic = "force-dynamic";

/**
 * Conta sem bar — o fim da linha, e é assim de propósito.
 *
 * Aqui existia o formulário que criava o bar: quem chegasse logado sem
 * estabelecimento digitava um nome e pronto, bar novo no banco. Era a última
 * porta de auto-cadastro que sobrava, e o "Entrar com Google" a escancararia —
 * qualquer conta Google do mundo cairia nesta tela com o botão de criar.
 *
 * Agora bar nasce em um lugar só: o painel de admin, feito por nós, a partir
 * de um pedido de contato. Esta página só explica isso e oferece as duas
 * saídas honestas — falar com a gente ou sair da conta.
 */
export default async function OnboardingPage() {
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

    if (admin) redirect("/admin");
  }

  const { bar } = await contextoDoDono();
  if (bar) redirect("/dashboard");

  return (
    <main className="min-h-dvh w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex flex-col justify-between p-6 md:p-10">
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="cursor-pointer">
          <LogoButeco className="w-36 h-12" priority />
        </Link>
        <div className="flex items-center gap-3">
          <TemaToggle />
          <BotaoSair />
        </div>
      </header>

      <div className="w-full max-w-md mx-auto my-auto rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl text-center">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M10 21v-6h4v6" />
          </svg>
        </div>

        <h1 className="text-2xl font-black tracking-tight">
          Sua conta ainda não tem um bar
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          O ButecoApp não cria estabelecimento sozinho. Quem monta o bar no sistema
          somos nós — é assim que garantimos que cada conta tem gente de verdade do
          outro lado.
        </p>

        <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          Se você já pediu acesso, é só aguardar: assim que o bar estiver montado, este
          login já entra direto no painel.
        </p>

        <Link
          href="/contato"
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-6 text-sm font-bold text-white shadow-xs transition-all active:scale-95"
        >
          Pedir o acesso do meu bar
        </Link>
      </div>

      <footer className="text-center text-xs text-stone-400 dark:text-stone-600">
        ButecoApp &bull; Conta sem estabelecimento vinculado
      </footer>
    </main>
  );
}
