import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";
import { NovaSenhaForm } from "./nova-senha-form";

export const dynamic = "force-dynamic";

/**
 * Destino do link de redefinição de senha.
 *
 * Só abre com a sessão que o /auth/callback criou a partir do token do e-mail.
 * Sem esse link não há sessão, e sem sessão a pessoa volta pro login — é isso
 * que garante que quem troca a senha é quem tem acesso à caixa postal.
 */
export default async function NovaSenhaPage() {
  if (!supabaseConfigurado()) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?erro=expirado");

  return (
    <main className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex flex-col justify-between p-6 md:p-10">
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between">
        <LogoButeco className="w-36 h-12" priority />
        <TemaToggle />
      </header>

      <div className="w-full max-w-md mx-auto my-auto rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            Cadastre sua nova senha
          </h1>
          <p className="mt-2 text-xs md:text-sm text-stone-500 dark:text-stone-400">
            Você chegou aqui pelo link enviado para{" "}
            <span className="font-bold text-stone-700 dark:text-stone-300">{user.email}</span>.
            Escolha a senha que vai usar para entrar no bar.
          </p>
        </div>

        <NovaSenhaForm />
      </div>

      <footer className="text-center text-xs text-stone-400 dark:text-stone-600">
        ButecoApp &bull; Redefinição de acesso
      </footer>
    </main>
  );
}
