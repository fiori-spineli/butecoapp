/**
 * Preferências de acessibilidade — tamanho de fonte, alto contraste e modo
 * para daltonismo.
 *
 * Vivem no aparelho (`localStorage`) e são aplicadas como atributos no
 * `<html>`, do mesmo jeito que o tema (ver lib/tema.ts) e pelo mesmo motivo:
 * quem precisa de fonte grande ou alto contraste é justamente quem não pode
 * ver a tela abrir no padrão e mudar meio segundo depois. O script abaixo roda
 * antes da primeira pintura.
 *
 * O `<html>` é a fonte única de verdade: o formulário de Ajustes lê dali (via
 * useSyncExternalStore), em vez de manter uma cópia em estado que pode
 * discordar do que está na tela.
 */

export type TamanhoFonte = "padrao" | "medio" | "grande";
export type ModoDaltonico =
  | "nenhum"
  | "deuteranopia"
  | "protanopia"
  | "tritanopia"
  | "monocromatico";

export type Acessibilidade = {
  fonte: TamanhoFonte;
  contraste: boolean;
  daltonismo: ModoDaltonico;
};

export const CHAVE_FONTE = "buteco_fonte";
export const CHAVE_CONTRASTE = "buteco_contraste";
export const CHAVE_DALTONICO = "buteco_daltonico";

const FONTES: TamanhoFonte[] = ["padrao", "medio", "grande"];
const DALTONISMOS: ModoDaltonico[] = [
  "nenhum",
  "deuteranopia",
  "protanopia",
  "tritanopia",
  "monocromatico",
];

/**
 * Valida em vez de confiar. O valor vem do `localStorage`, que qualquer
 * extensão ou versão antiga do app pode ter sujado — antes isso era um
 * `as any`, e um lixo ali viraria um atributo inválido no `<html>`.
 */
function comoFonte(v: string | null): TamanhoFonte {
  return FONTES.includes(v as TamanhoFonte) ? (v as TamanhoFonte) : "padrao";
}

function comoDaltonismo(v: string | null): ModoDaltonico {
  return DALTONISMOS.includes(v as ModoDaltonico) ? (v as ModoDaltonico) : "nenhum";
}

/** Lê o que está valendo AGORA, direto do `<html>`. */
export function lerAcessibilidade(): Acessibilidade {
  if (typeof document === "undefined") {
    return { fonte: "padrao", contraste: false, daltonismo: "nenhum" };
  }
  const html = document.documentElement;
  return {
    fonte: comoFonte(html.getAttribute("data-fonte")),
    contraste: html.getAttribute("data-contraste") === "alto",
    daltonismo: comoDaltonismo(html.getAttribute("data-daltonico")),
  };
}

/** Aplica no `<html>` e guarda no aparelho. */
export function aplicarAcessibilidade(a: Acessibilidade) {
  const html = document.documentElement;
  html.setAttribute("data-fonte", a.fonte);
  html.setAttribute("data-contraste", a.contraste ? "alto" : "normal");
  html.setAttribute("data-daltonico", a.daltonismo);

  try {
    localStorage.setItem(CHAVE_FONTE, a.fonte);
    localStorage.setItem(CHAVE_CONTRASTE, String(a.contraste));
    localStorage.setItem(CHAVE_DALTONICO, a.daltonismo);
  } catch {
    // Armazenamento bloqueado: a escolha vale para esta aba. Melhor que estourar.
  }
}

/**
 * Aplica ANTES da primeira pintura. Vai como script síncrono no topo do
 * <body> (app/layout.tsx), junto com o do tema.
 */
export const SCRIPT_ACESSIBILIDADE = `(function(){try{var h=document.documentElement;var f=localStorage.getItem(${JSON.stringify(
  CHAVE_FONTE,
)});var d=localStorage.getItem(${JSON.stringify(CHAVE_DALTONICO)});var c=localStorage.getItem(${JSON.stringify(
  CHAVE_CONTRASTE,
)});h.setAttribute("data-fonte",["padrao","medio","grande"].indexOf(f)>-1?f:"padrao");h.setAttribute("data-contraste",c==="true"?"alto":"normal");h.setAttribute("data-daltonico",["nenhum","deuteranopia","protanopia","tritanopia","monocromatico"].indexOf(d)>-1?d:"nenhum");}catch(_){}})();`;
