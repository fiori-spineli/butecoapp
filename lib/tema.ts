/**
 * Tema claro/escuro — a escolha vive no aparelho, não no servidor.
 *
 * Guardar no banco obrigaria a esperar uma resposta antes de pintar a tela, e
 * o app tem que abrir como página estática abre: instantâneo. `localStorage` é
 * lido antes do primeiro pixel (ver SCRIPT_TEMA) e responde na hora. O preço é
 * a escolha ser por aparelho — o que, para um bar com um celular no balcão e
 * um computador no caixa, é o comportamento certo: o brilho do salão à noite
 * não é o mesmo da tela do caixa.
 */
export const CHAVE_TEMA = "buteco_tema";

export type PreferenciaDeTema = "claro" | "escuro" | "automatico";

/**
 * Aplica o tema ANTES da primeira pintura.
 *
 * Roda como script síncrono no topo do <body> (ver app/layout.tsx). Antes,
 * quem fazia isso era o botão de tema, dentro de um useEffect: a página
 * pintava clara e escurecia depois, aquele susto branco a cada navegação. E,
 * como o botão era quem aplicava, uma tela sem botão abria no tema errado.
 *
 * Falha em silêncio de propósito: navegador com armazenamento bloqueado
 * (aba anônima restrita, cookies de terceiros) cai no tema do sistema em vez
 * de quebrar a página inteira.
 */
export const SCRIPT_TEMA = `(function(){try{var p=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});var e=p==="escuro"||p==="dark"||((!p||p==="automatico")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList[e?"add":"remove"]("dark");}catch(_){}})();`;

/** Grava a preferência e aplica na hora. */
export function aplicarTema(preferencia: PreferenciaDeTema) {
  const escuro =
    preferencia === "escuro" ||
    (preferencia === "automatico" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", escuro);

  try {
    localStorage.setItem(CHAVE_TEMA, preferencia);
  } catch {
    // Sem armazenamento a escolha vale só para esta aba. Melhor que estourar.
  }
}

/** O que está gravado hoje. */
export function lerPreferencia(): PreferenciaDeTema {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    if (salvo === "escuro" || salvo === "dark") return "escuro";
    if (salvo === "claro" || salvo === "light") return "claro";
  } catch {
    // ignora
  }
  return "automatico";
}
