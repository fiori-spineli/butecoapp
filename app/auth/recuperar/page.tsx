import type { Metadata } from "next";
import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";
import { AbrirLinkForm } from "./abrir-link-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Criar nova senha — ButecoApp",
  // A URL carrega o token do e-mail. Sem Referer, nenhum recurso de fora que a
  // página venha a carregar recebe esse endereço.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

/**
 * Onde o link do e-mail de recuperação chega.
 *
 * Abrir esta página NÃO gasta o link. Quem gasta é o botão, num POST (ver
 * abrirLinkDeRecuperacao em app/actions/auth.ts). O motivo é quem mais abre
 * links além da pessoa: o robô de segurança do provedor de e-mail e a
 * pré-visualização do WhatsApp, por onde o backoffice manda o link de acesso.
 * Os dois fazem GET sozinhos. Quando o GET trocava o token por sessão, a
 * pessoa recebia um link que já tinha sido usado por uma máquina.
 */
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const parametros = await searchParams;
  const tokenHash = parametros.token_hash ?? "";
  const code = parametros.code ?? "";

  // O próprio Supabase já recusou o link antes de mandar a pessoa para cá
  // (template padrão: o /verify dele gasta o token e devolve o erro na URL).
  const erroSupabase = parametros.error_code ?? parametros.error ?? "";
  const venceu = /expired/i.test(`${erroSupabase} ${parametros.error_description ?? ""}`);

  const problema = erroSupabase
    ? venceu
      ? "Este link já foi usado ou venceu. Os links de recuperação valem por 1 hora e só uma vez."
      : "Não consegui validar este link."
    : !tokenHash && !code
      ? "Este endereço está incompleto — o link do e-mail pode ter sido cortado ao copiar."
      : null;

  return (
    <main className="min-h-dvh w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors flex flex-col justify-between p-6 md:p-10">
      <header className="w-full max-w-2xl mx-auto flex items-center justify-between">
        <Link href="/" className="cursor-pointer">
          <LogoButeco className="w-36 h-12" priority />
        </Link>
        <TemaToggle />
      </header>

      <div className="w-full max-w-md mx-auto my-auto rounded-3xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 shadow-xl">
        {problema ? (
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight">Link inválido</h1>
            <p role="alert" className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {problema}
            </p>
            <Link
              href="/login?modo=recuperar"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-600 px-6 text-sm font-bold text-white shadow-xs transition-colors"
            >
              Pedir um código novo
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Criar nova senha</h1>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                Tudo certo com o link do e-mail. Toque no botão para escolher a sua senha nova.
              </p>
            </div>
            <AbrirLinkForm tokenHash={tokenHash} code={code} />
          </>
        )}
      </div>

      <footer className="text-center text-xs text-stone-400 dark:text-stone-600">
        ButecoApp &bull; Redefinição de acesso
      </footer>
    </main>
  );
}
