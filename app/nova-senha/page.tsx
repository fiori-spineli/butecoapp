import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { validRecoveryProof } from "@/lib/neon/recovery";
import { getNeonSession } from "@/lib/neon-session";
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

export default async function NovaSenhaPage() {
  const proof = await validRecoveryProof();
  const session = await getNeonSession();
  if (!proof && !session) redirect("/login?modo=recuperar");

  return (
    <main className="min-h-dvh w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex flex-col justify-between p-6 md:p-10">
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between gap-3">
        <LogoButeco className="w-36 h-12" priority />
        <div className="flex items-center gap-3"><TemaToggle /><BotaoSair /></div>
      </header>
      <div className="w-full max-w-md mx-auto my-auto rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-black">{proof ? "Cadastre sua nova senha" : "Confirme que é você"}</h1>
          <p className="mt-2 text-sm text-stone-500">
            {proof ? `Conta ${proof.email}. Escolha uma senha para entrar no bar.` :
              "Para trocar a senha, confirme o código enviado ao e-mail da sua conta."}
          </p>
        </div>
        {proof ? <NovaSenhaForm email={proof.email} /> :
          <RecuperarSenha modo="perfil" emailInicial={session?.email ?? ""} />}
      </div>
      <footer className="text-center text-xs text-stone-400">ButecoApp &bull; Redefinição de acesso</footer>
    </main>
  );
}
