/**
 * O batimento que mantém a tela do dono em dia com o que foi feito no OUTRO
 * aparelho (o celular no salão e o computador no caixa, mesma conta).
 *
 * COMO: pergunta uma ASSINATURA do bar (`/api/bar/atividade`, 32 caracteres) e
 * só avisa os ouvintes quando ela MUDA. Perguntar é barato, então dá para
 * perguntar quase o tempo todo; recarregar é caro, então só acontece quando há
 * o que mostrar. É isso que permite o cache do roteador durar minutos (ver
 * `staleTimes` em next.config.ts) sem a tela ficar velha: trocar de aba não
 * espera o servidor, e o dado novo chega sozinho em segundos.
 *
 * POR QUE ISTO VIVE FORA DO REACT — incidente de 2026-09-16, medido em produção
 * numa aba que o dono deixou aberta:
 *
 *   O loop morava dentro do `useEffect` de <AtualizacaoAoVivo />, que cada
 *   página montava por conta própria — e sob um pai diferente em cada uma
 *   (`<div>` no dashboard, fragmento em produtos). Trocar de aba, então, não
 *   reconciliava o componente: DESMONTAVA e remontava. A limpeza do efeito
 *   (`ativo = false`, listeners removidos, timer cancelado) rodava a cada
 *   clique na navegação.
 *
 *   Na aba periciada o poll rodou 112 vezes, cravando 8,2 s, e parou de vez às
 *   604167 ms — sem navegação nenhuma nos 6,4 minutos anteriores, sem erro no
 *   console, sem requisição pendurada, com o React vivo (o filtro da busca
 *   ainda respondia) e a tela pintando normalmente. Eventos sintéticos de
 *   `focus`, `visibilitychange` e `online` não ressuscitaram nada: a limpeza
 *   tinha rodado sem uma montagem correspondente. Navegar para /produtos
 *   também não trouxe de volta. Só um F5 traria — e é exatamente isso que o
 *   dono descrevia como "o app congelou".
 *
 * Daí as três decisões deste arquivo:
 *
 *   1. O relógio é do MÓDULO, não de um componente. Desmontar uma tela passou a
 *      custar remover um callback de um Set — nunca mais parar o relógio.
 *
 *   2. É um `setInterval` que TICA e decide, não uma corrente de `setTimeout`
 *      que se reagenda. Numa corrente, cada volta só existe porque a anterior
 *      chegou ao fim: basta uma promessa que não resolve, uma exceção engolida
 *      ou uma limpeza fora de hora para a corrente arrebentar — em silêncio e
 *      para sempre. Um intervalo continua batendo aconteça o que acontecer
 *      dentro dele. O tique custa uma comparação de inteiros a cada segundo.
 *
 *   3. Toda espera tem prazo. O `fetch` é abortado aos 10 s e a trava de
 *      reentrada se rompe sozinha aos 30 s. Diante da dúvida, este arquivo
 *      prefere uma requisição a mais a ficar mudo para sempre (GUARDRAILS §2:
 *      falha engolida não aparece em listener de erro nem no console).
 *
 * CADÊNCIA (o Page Visibility API pede pausa explícita, não confiar no
 * throttling do navegador):
 *   - aba à vista e alguém mexendo: 2 s;
 *   - aba à vista e parada há mais de um minuto: 8 s;
 *   - aba escondida: NADA. Sem rede, sem bateria, sem servidor;
 *   - ao voltar para a aba: pergunta no tique seguinte (no máximo 1 s);
 *   - erro de rede: espera o dobro a cada falha, até 30 s.
 */

const INTERVALO_ATIVO_MS = 2000;
const INTERVALO_OCIOSO_MS = 8000;
const INTERVALO_MAXIMO_MS = 30000;
const OCIOSO_APOS_MS = 60000;

/** De quanto em quanto tempo o relógio ACORDA — não de quanto em quanto tempo ele pergunta. */
const TIQUE_MS = 1000;
/** Prazo do `fetch`. Sem isto, uma requisição pendurada cala o app inteiro. */
const PRAZO_REQUISICAO_MS = 10000;
/** Se a trava de reentrada passar disto, foi bug nosso: rompe e segue. */
const PRAZO_TRAVA_MS = 30000;
/**
 * Folga para o tique não perder a batida por um triz.
 *
 * `setInterval` não entrega 1000 ms cravados (medido: 2984 a 3009 numa janela de
 * três tiques). Sem esta folga, um tique que chega 4 ms adiantado acha que ainda
 * não é hora e joga a conferência para o tique seguinte — um segundo inteiro a
 * mais. Com ela, o erro do relógio do navegador não vira atraso visível.
 */
const FOLGA_DO_TIQUE_MS = 100;

type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();

let relogio: ReturnType<typeof setInterval> | undefined;
let conferindo = false;
let iniciouConferencia = 0;
let assinatura: string | null = null;
let falhas = 0;
let ultimaInteracao = 0;
let ultimaConferencia = 0;

function intervaloAtual(): number {
  if (falhas > 0) return Math.min(INTERVALO_ATIVO_MS * 2 ** falhas, INTERVALO_MAXIMO_MS);
  return Date.now() - ultimaInteracao > OCIOSO_APOS_MS ? INTERVALO_OCIOSO_MS : INTERVALO_ATIVO_MS;
}

async function conferir(): Promise<void> {
  conferindo = true;
  iniciouConferencia = Date.now();
  // O relógio da cadência conta do INÍCIO de uma pergunta ao início da próxima.
  // Contar do fim somava a duração da requisição ao intervalo e, na grade de um
  // tique por segundo, arredondava para cima: os 2 s prometidos viravam 3 s
  // medidos, e os 8 s viravam 9 s (medido em produção antes desta linha existir).
  ultimaConferencia = iniciouConferencia;

  const cancelamento = new AbortController();
  const prazo = setTimeout(() => cancelamento.abort(), PRAZO_REQUISICAO_MS);

  try {
    const resposta = await fetch("/api/bar/atividade", {
      cache: "no-store",
      signal: cancelamento.signal,
    });
    if (!resposta.ok) throw new Error(String(resposta.status));

    const { assinatura: nova } = (await resposta.json()) as { assinatura: string };
    falhas = 0;

    // A primeira resposta só estabelece a referência: a tela acabou de ser
    // renderizada pelo servidor, já está em dia.
    if (assinatura !== null && nova !== assinatura) {
      for (const ouvinte of ouvintes) ouvinte();
    }
    assinatura = nova;
  } catch {
    falhas += 1;
  } finally {
    // Incondicional de propósito: é o `finally` que garante que a próxima volta
    // acontece mesmo quando esta deu errado. Soltar a trava é o que basta — a
    // hora da próxima pergunta já foi marcada lá em cima, no início desta.
    clearTimeout(prazo);
    conferindo = false;
  }
}

function bater(): void {
  // Trava de reentrada que não desarmou: não existe caminho conhecido para isto
  // (o fetch tem prazo e o `finally` sempre roda), mas se um dia existir, o app
  // se recupera sozinho em 30 s em vez de ficar mudo até alguém dar F5.
  if (conferindo && Date.now() - iniciouConferencia > PRAZO_TRAVA_MS) conferindo = false;

  if (conferindo) return;
  if (ouvintes.size === 0) return;
  if (document.hidden) return;
  if (Date.now() - ultimaConferencia < intervaloAtual() - FOLGA_DO_TIQUE_MS) return;

  void conferir();
}

function marcarInteracao(): void {
  ultimaInteracao = Date.now();
}

/**
 * A atenção voltou para a aba: zera o castigo do backoff e força a conferência
 * no tique seguinte.
 *
 * Zerar `ultimaConferencia` em vez de chamar `conferir()` na hora é o que
 * elimina a corrida antiga: `visibilitychange`, `focus` e `pageshow` chegam
 * quase juntos, e três chamadas diretas abriam três correntes paralelas de
 * timer. Aqui os três marcam a mesma variável e o relógio pergunta UMA vez.
 */
function aoVoltar(): void {
  if (document.hidden) return;
  marcarInteracao();
  falhas = 0;
  ultimaConferencia = 0;
}

const EVENTOS_DE_INTERACAO = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
/** `passive` e `capture`: só observar, sem atrapalhar rolagem nem clique. */
const OPCOES_PASSIVAS = { passive: true, capture: true } as const;

/**
 * Liga o relógio na primeira vez e nunca mais desliga.
 *
 * Não desligar é a decisão, não um descuido: era o desligamento que matava o
 * app. Sem ouvintes o tique cai fora logo no começo de `bater()`, então o custo
 * de uma aba parada fora do painel é uma comparação de inteiros por segundo.
 */
function ligarRelogio(): void {
  if (relogio !== undefined) return;

  ultimaInteracao = Date.now();
  relogio = setInterval(bater, TIQUE_MS);

  document.addEventListener("visibilitychange", aoVoltar);
  window.addEventListener("focus", aoVoltar);
  window.addEventListener("pageshow", aoVoltar);
  window.addEventListener("online", aoVoltar);
  for (const evento of EVENTOS_DE_INTERACAO) {
    window.addEventListener(evento, marcarInteracao, OPCOES_PASSIVAS);
  }
}

/**
 * Registra quem quer ser avisado quando o bar mudar. Devolve a função de
 * cancelamento — que remove o ouvinte e NÃO para o relógio.
 */
export function assinarSincronia(aoMudar: Ouvinte): () => void {
  ouvintes.add(aoMudar);
  ligarRelogio();
  return () => {
    ouvintes.delete(aoMudar);
  };
}
