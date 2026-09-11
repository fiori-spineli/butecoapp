import Link from "next/link";
import { LogoButeco } from "@/components/logo-buteco";
import { TemaToggle } from "@/components/tema-toggle";
import { FundoChopp } from "@/components/fundo-chopp";
import { CtaDoTopo } from "@/components/cta-do-topo";

/**
 * A porta da rua do ButecoApp.
 *
 * Antes, quem chegasse em butecoapp.vercel.app caía direto no formulário de
 * login — o que só faz sentido para quem já é cliente. Quem ouviu falar do
 * sistema e foi olhar não tinha uma linha explicando o que era.
 *
 * Aqui a ordem se inverte: primeiro o que o sistema faz, depois como pedir. E
 * daqui não se chega ao login: a vitrine é um corpo à parte do app, com uma
 * saída só, que é falar com a gente. Quem já é cliente recebeu de nós o
 * endereço do /login.
 */

const RECURSOS = [
  {
    titulo: "Comanda em segundos",
    texto:
      "Abre por número de mesa ou pelo nome do freguês. O que foi pedido entra com um toque, sem digitar preço de novo a cada rodada.",
    icone: (
      <>
        <path d="M8 2v4M16 2v4" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    titulo: "O cliente confere sozinho",
    texto:
      "Cada mesa tem um QR Code. O cliente aponta a câmera e acompanha o consumo em tempo real — sem instalar nada, sem criar conta.",
    icone: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM19 19h2M17 21h4" />
      </>
    ),
  },
  {
    titulo: "Cardápio com foto",
    texto:
      "Cadastre uma vez com foto e preço. Quem está no balcão acha o item pela imagem, que é mais rápido do que ler uma lista no meio do movimento.",
    icone: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </>
    ),
  },
  {
    titulo: "Conta dividida sem dor",
    texto:
      "Um paga o que comeu, outro paga um valor por fora, e a conta continua batendo. O saldo nunca fica negativo nem some do controle.",
    icone: (
      <>
        <path d="M16 3h5v5" />
        <path d="M21 3l-7 7" />
        <path d="M8 21H3v-5" />
        <path d="M3 21l7-7" />
        <path d="M3 8V3h5" />
        <path d="M21 16v5h-5" />
      </>
    ),
  },
  {
    titulo: "Fechamento para imprimir",
    texto:
      "No fim do dia, uma folha com tudo que está aberto: mesa, tempo, consumo e o que falta receber. Dá para imprimir, salvar em PDF ou baixar em planilha.",
    icone: (
      <>
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
      </>
    ),
  },
  {
    titulo: "O que vende de verdade",
    texto:
      "Faturamento do período e ranking dos itens mais pedidos. Serve para decidir o que comprar na próxima semana, não só para olhar.",
    icone: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-5 3 3 5-7" />
      </>
    ),
  },
];

const PASSOS = [
  {
    titulo: "A gente cria a conta",
    texto:
      "Você pede o acesso nesta página e nós montamos o bar no sistema. Não existe cadastro automático — é conversa com gente.",
  },
  {
    titulo: "Você monta o cardápio",
    texto:
      "Foto, nome e preço de cada item. Leva alguns minutos e é a única coisa que precisa ser feita antes de abrir a primeira mesa.",
  },
  {
    titulo: "O movimento roda no celular",
    texto:
      "Abre a comanda, lança o pedido, mostra o QR para o cliente. Tudo com uma mão só, que é como se trabalha atrás do balcão.",
  },
  {
    titulo: "No fim da noite, fecha e confere",
    texto:
      "Registra o pagamento, fecha a conta e imprime o resumo do dia. O cliente ainda vê o comprovante por 24 horas.",
  },
];

export function Vitrine() {
  return (
    // <main> e nao <div>: o Lighthouse acusou "Document does not have a main
    // landmark". Leitor de tela usa esse marco para pular direto ao conteudo
    // em vez de percorrer o cabecalho a cada pagina.
    <main className="min-h-dvh bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      {/* ---------- Topo ---------- */}
      <header className="sticky top-0 z-30 border-b border-stone-200/80 dark:border-stone-800/80 bg-stone-100 dark:bg-stone-950 sm:bg-stone-100/85 sm:dark:bg-stone-950/85 sm:backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <LogoButeco className="w-32 sm:w-40 h-11 sm:h-14" priority />

          <div className="flex items-center gap-1.5 sm:gap-3">
            <TemaToggle />

            {/*
              Não existe link para o login aqui, e isso é decisão de projeto.
              Esta página é a vitrine: ela apresenta o sistema e oferece UM
              caminho, que é falar com a gente. Quem já tem conta recebeu de nós
              o endereço do /login e vai direto; quem está só olhando não é
              empurrado para uma porta que ainda não é dele.
            */}
            {/* Só aparece depois que o botão da chamada some da tela — ver
                components/cta-do-topo.tsx. */}
            <CtaDoTopo alvo="cta-principal" />
          </div>
        </div>
      </header>

      {/* ---------- Chamada ---------- */}
      <section className="relative overflow-hidden border-b border-stone-200 dark:border-stone-800 bg-linear-to-br from-stone-950 via-amber-950/85 to-stone-950 text-stone-100">
        <FundoChopp />

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/20 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-amber-300">
              Comanda digital para bar de bairro
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight text-white">
              O caderninho do buteco,
              <br />
              agora no celular.
            </h1>

            <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-stone-300">
              Abra a mesa, anote o pedido com um toque e deixe o cliente conferir a
              conta pelo QR Code. Sem ficha molhada, sem conta somada errada na
              pressa do fim da noite.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                id="cta-principal"
                href="/contato"
                className="cursor-pointer inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-800 px-7 text-sm font-bold text-white shadow-lg shadow-amber-950/40 transition-all active:scale-95"
              >
                Quero no meu bar
              </Link>
              {/*
                <a> comum, não <Link>: é rolagem dentro da própria página. O
                Link do Next transformava o toque numa navegação suave que
                refazia a página antes de rolar — no iPhone parecia que o
                botão não fazia nada. A âncora nativa rola na hora.
              */}
              <a
                href="#como-funciona"
                className="cursor-pointer inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-600 bg-stone-900/40 px-7 text-sm font-bold text-stone-100 backdrop-blur-xs transition-colors hover:border-amber-500 hover:text-amber-300"
              >
                Como funciona
              </a>
            </div>

            <p className="mt-5 text-xs text-stone-400">
              Funciona no navegador do celular. Sem loja de aplicativo, sem maquininha nova.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Sobre o sistema ---------- */}
      <section id="sobre" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:scroll-mt-20 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Sobre o sistema
            </h2>
            <div className="mt-5 space-y-4 text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300">
              <p>
                O ButecoApp nasceu de um problema que todo bar pequeno conhece: a
                comanda de papel. Ela molha, some, é anotada com pressa e no fim da
                noite alguém precisa somar tudo de cabeça — normalmente a mesma
                pessoa que está servindo, recebendo e fechando o caixa.
              </p>
              <p>
                O sistema faz esse trabalho. Cada mesa vira uma comanda no celular,
                cada item entra com um toque, e a soma é do computador. O cliente
                acompanha o consumo dele pelo próprio celular, o que resolve a
                discussão do balcão antes dela começar.
              </p>
              <p>
                Não é um sistema de restaurante grande adaptado para bar pequeno. Foi
                feito para uma pessoa atendendo com uma mão só, num aparelho comum, em
                rede de bar.
              </p>
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs">
              <dt className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Do lado do cliente
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                Nenhum cadastro, nenhum aplicativo. Ele aponta a câmera para o QR da
                mesa e vê o que consumiu, com hora de cada pedido e o que falta pagar.
              </dd>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs">
              <dt className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Do lado do bar
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                Cada bar enxerga só os próprios dados. O link da conta do cliente para
                de funcionar 24 horas depois de fechada — comprovante tem prazo, não é
                página pública para sempre.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------- Recursos ---------- */}
      <section className="border-y border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-900/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            O que ele faz
          </h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((recurso) => (
              <article
                key={recurso.titulo}
                className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs transition-transform hover:-translate-y-0.5"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {recurso.icone}
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-black text-stone-900 dark:text-stone-100">
                  {recurso.titulo}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                  {recurso.texto}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Como funciona ---------- */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:scroll-mt-20 sm:px-6 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Como funciona</h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600 dark:text-stone-300">
          Do primeiro contato até a primeira mesa aberta são quatro passos, e o
          primeiro é nosso.
        </p>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map((passo, indice) => (
            <li
              key={passo.titulo}
              className="relative rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 shadow-xs"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-stone-900 dark:bg-amber-700 text-sm font-black text-white">
                {indice + 1}
              </span>
              <h3 className="mt-4 text-sm font-black text-stone-900 dark:text-stone-100">
                {passo.titulo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {passo.texto}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Chamada final ---------- */}
      <section className="border-t border-stone-200 dark:border-stone-800 bg-stone-900 dark:bg-stone-900/70 text-stone-100">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Quer testar no seu bar?
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-stone-300">
            Conta pra gente o nome do bar e um telefone. A gente prepara o acesso e
            avisa você — não tem formulário de cadastro para preencher nem cartão para
            informar.
          </p>

          <Link
            href="/contato"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-800 px-8 text-sm font-bold text-white shadow-lg shadow-black/30 transition-all active:scale-95"
          >
            Falar com a gente
          </Link>
        </div>
      </section>

      {/* ---------- Rodapé ---------- */}
      <footer className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-stone-200 dark:border-stone-800 pt-8 sm:flex-row">
          <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
            <Link
              href="https://www.linkedin.com/in/samuel-spineli/"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100 hover:underline"
            >
              Samuel Spineli
            </Link>
            <span aria-hidden>&bull;</span>
            <Link
              href="https://www.linkedin.com/in/lucas-fiori/"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer hover:text-stone-900 dark:hover:text-stone-100 hover:underline"
            >
              Lucas Fiori
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
            <Link href="/contato" className="cursor-pointer hover:underline">
              Pedir acesso
            </Link>
            <Link href="/privacidade" className="cursor-pointer hover:underline">
              Privacidade
            </Link>
            <span>ButecoApp &copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
