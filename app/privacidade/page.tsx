import type { Metadata } from "next";
import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";

export const metadata: Metadata = {
  title: "Privacidade — ButecoApp",
  description:
    "Que dados o ButecoApp coleta, por quê, com quem eles são compartilhados e como pedir a exclusão.",
};

/**
 * Política de privacidade.
 *
 * Existe por dois motivos concretos, não por formalidade:
 *
 * 1. O formulário de contato coleta nome, e-mail e telefone de gente que ainda
 *    nem é cliente. Isso é dado pessoal, e a LGPD pede que a pessoa saiba o que
 *    acontece com ele antes de digitar.
 * 2. O modo invisível do Turnstile só pode ser ligado com uma condição escrita
 *    pela Cloudflare: referenciar o Turnstile Privacy Addendum nesta página.
 *    Sem isto, ligar o modo invisível seria descumprir o termo de uso.
 *
 * O texto é curto de propósito. Política que ninguém lê não informa ninguém.
 */

const ATUALIZADO_EM = "10 de setembro de 2026";

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-black tracking-tight text-stone-900 dark:text-stone-100">
        {titulo}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <main className="min-h-dvh bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="cursor-pointer">
            <LogoButeco className="w-32 sm:w-40 h-11 sm:h-14" priority />
          </Link>
          <div className="flex items-center gap-2">
            <TemaToggle />
            <Link
              href="/"
              className="cursor-pointer inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-stone-500 dark:text-stone-400 underline-offset-4 transition-colors hover:text-stone-900 dark:hover:text-stone-100 hover:underline"
            >
              Voltar
            </Link>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Privacidade</h1>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Atualizada em {ATUALIZADO_EM}
        </p>

        <p className="mt-6 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
          O ButecoApp é feito por duas pessoas, Samuel Spineli e Lucas Fiori. Esta
          página diz, sem rodeio, quais dados o sistema guarda, por que guarda e com
          quem eles são compartilhados.
        </p>

        <Secao titulo="Quando você pede acesso pelo formulário">
          <p>
            Guardamos o que você digita: seu nome, o nome do bar, telefone, e-mail e,
            se você escrever, cidade e recado. Usamos isso para uma coisa só — falar
            com você sobre o ButecoApp. Não entra em lista de e-mail e não é repassado
            para ninguém.
          </p>
          <p>
            Guardamos também um <strong>código embaralhado do seu endereço de
            internet</strong> (um hash), nunca o endereço em si. Ele serve para limitar
            quantos pedidos saem da mesma conexão por dia e barrar envio automático. Não
            dá para voltar dele ao seu endereço.
          </p>
          <p>
            Se você não virar cliente, é só pedir a exclusão pelo contato no fim desta
            página que apagamos tudo.
          </p>
        </Secao>

        <Secao titulo="Se você é dono de um bar que usa o sistema">
          <p>
            A conta guarda o e-mail de acesso e os dados do seu bar: produtos, comandas,
            lançamentos e pagamentos registrados. Cada bar enxerga só os próprios dados —
            isso é garantido pelo banco, não só pela tela.
          </p>
          <p>
            Sua senha nunca é vista por nós: ela é gravada embaralhada pelo serviço de
            autenticação, e trocar de senha sempre passa por um link enviado ao seu
            e-mail.
          </p>
        </Secao>

        <Secao titulo="Se você é cliente de um bar e abriu a conta pelo QR Code">
          <p>
            A página da comanda <strong>não pede e não guarda nada seu</strong>. Sem
            cadastro, sem login, sem cookie de identificação. Ela mostra o que o bar
            lançou naquela mesa, e o link para de funcionar 24 horas depois de a conta
            ser fechada.
          </p>
        </Secao>

        <Secao titulo="Com quem esses dados são compartilhados">
          <p>Só com os serviços que fazem o sistema funcionar:</p>
          <ul className="ml-4 list-disc space-y-2">
            <li>
              <strong>Supabase</strong> — banco de dados, contas e fotos dos produtos.
            </li>
            <li>
              <strong>Vercel</strong> — hospedagem do site.
            </li>
            <li>
              <strong>Cloudflare Turnstile</strong> — verificação anti-robô no login e no
              formulário de contato. Para distinguir gente de robô, o Turnstile analisa
              sinais do seu navegador, como o endereço de internet e o tipo de navegador.
              A Cloudflare declara que o objetivo desses sinais é apenas bloquear robôs,
              não identificar ou perfilar pessoas. Os detalhes estão no{" "}
              <Link
                href="https://www.cloudflare.com/turnstile-privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                Turnstile Privacy Addendum da Cloudflare
              </Link>
              .
            </li>
            <li>
              <strong>Resend</strong> — envio dos e-mails do sistema (link de senha e
              aviso de pedido novo).
            </li>
            <li>
              <strong>Vercel Analytics e Speed Insights</strong> — contagem de acessos e
              tempo de carregamento, sem identificar visitante. O endereço da página da
              comanda é limpo antes de sair do navegador, para que o código de acesso do
              cliente nunca chegue a um painel de métricas.
            </li>
          </ul>
        </Secao>

        <Secao titulo="Cookies">
          <p>
            Só um: o de sessão, que mantém o dono do bar conectado. Ele é inacessível a
            qualquer JavaScript da página e não serve para publicidade. A escolha entre
            tema claro e escuro fica gravada no seu próprio navegador e não chega até
            nós.
          </p>
        </Secao>

        <Secao titulo="Seus direitos">
          <p>
            Você pode pedir para ver, corrigir ou apagar seus dados a qualquer momento, e
            não precisa justificar. Fale com a gente pelo LinkedIn —{" "}
            <Link
              href="https://www.linkedin.com/in/samuel-spineli/"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer font-semibold hover:underline"
            >
              Samuel
            </Link>{" "}
            ou{" "}
            <Link
              href="https://www.linkedin.com/in/lucas-fiori/"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer font-semibold hover:underline"
            >
              Lucas
            </Link>{" "}
            — ou responda o e-mail que trocamos com você.
          </p>
        </Secao>

        <div className="mt-12 border-t border-stone-200 dark:border-stone-800 pt-6 text-center">
          <Link
            href="/contato"
            className="cursor-pointer inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-6 text-xs font-bold text-white shadow-xs transition-colors"
          >
            Quero o ButecoApp no meu bar
          </Link>
        </div>
      </article>
    </main>
  );
}
