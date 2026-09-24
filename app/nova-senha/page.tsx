import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, supabaseConfigurado } from "@/lib/supabase/server";
import { precisaTrocarSenha, sessaoProvouOEmail } from "@/lib/recuperacao";
import { provaDeEmailValida } from "@/lib/prova-email";
import { TemaToggle } from "@/components/tema-toggle";
import { LogoButeco } from "@/components/logo-buteco";
import { BotaoSair } from "@/components/botao-sair";
import { RecuperarSenha } from "@/components/recuperar-senha";
import { NovaSenhaForm } from "./nova-senha-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nova senha — ButecoApp",
  robots: { index: false, follow: false },
};

/**
 * Onde a senha nova é gravada.
 *
 * Chega-se aqui por três caminhos, e só por eles:
 * - o código de 8 números do e-mail (confirmarCodigoDeRecuperacao);
 * - o link do e-mail (/auth/recuperar);
 * - a senha provisória do backoffice (o proxy manda para cá até ela ser
 *   trocada — ver proxy.ts).
 *
 * Uma sessão comum que digite /nova-senha na barra não grava senha nenhuma:
 * ganha o mesmo pedido de código por e-mail. Era isso que faltava — antes,
 * qualquer um com o celular do dono logado trocava a senha dele por aqui.
 */
export default async function NovaSenhaPage() {
  if (!supabaseConfigurado()) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?modo=recuperar&erro=expirado");

  const provisoria = precisaTrocarSenha(user);
  const provou =
    provisoria || (await provaDeEmailValida(user.id)) || (await sessaoProvouOEmail(supabase));

  return (
    <main className="min-h-dvh w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex flex-col justify-between p-6 md:p-10">
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between gap-3">
        <LogoButeco className="w-36 h-12" priority />
        <div className="flex items-center gap-3">
          <TemaToggle />
          <BotaoSair />
        </div>
      </header>

      <div className="w-full max-w-md mx-auto my-auto rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            {provisoria ? "Crie a sua senha" : provou ? "Cadastre sua nova senha" : "Confirme que é você"}
          </h1>
          <p className="mt-2 text-xs md:text-sm text-stone-500 dark:text-stone-400">
            {provisoria ? (
              <>
                Você entrou com a senha provisória que recebeu da gente. Escolha agora a
                senha que só você vai saber — a provisória deixa de valer.
              </>
            ) : provou ? (
              <>
                Conta{" "}
                <span className="font-bold text-stone-700 dark:text-stone-300">{user.email}</span>.
                Escolha a senha que vai usar para entrar no bar.
              </>
            ) : (
              <>Para trocar a senha, confirme pelo código que vamos mandar ao seu e-mail.</>
            )}
          </p>
        </div>

        {provou ? (
          <NovaSenhaForm email={user.email ?? ""} />
        ) : (
          <RecuperarSenha modo="perfil" emailInicial={user.email ?? ""} />
        )}
      </div>

      <footer className="text-center text-xs text-stone-400 dark:text-stone-600">
        ButecoApp &bull; Redefinição de acesso
      </footer>
    </main>
  );
}
