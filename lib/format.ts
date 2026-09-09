/**
 * Dinheiro é sempre inteiro em centavos; datas são sempre instantes UTC
 * convertidos para America/Sao_Paulo só na exibição (decisão 3.4 do doc).
 */

export const TIMEZONE = "America/Sao_Paulo";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatarReais(centavos: number): string {
  return brl.format((centavos ?? 0) / 100);
}

/**
 * Texto digitado pelo dono -> centavos. `null` quando não dá para entender.
 *
 * Tudo é feito em inteiro, montando a string de centavos: dinheiro não passa
 * por ponto flutuante em momento nenhum, nem no meio do caminho. A versão
 * anterior fazia `Math.round(valor * 100)`, e é assim que R$ 8,115 vira 811 em
 * vez de 812.
 *
 * A regra do separador decimal é a que o brasileiro usa sem pensar: vale o
 * ÚLTIMO separador, e só se sobrarem 1 ou 2 dígitos depois dele. Com 3 dígitos
 * é separador de milhar — "1.500" é mil e quinhentos, não um e meio.
 */
export function parseReaisParaCentavos(entrada: string): number | null {
  // Sinal negativo não existe em conta de bar. Recusar é melhor do que virar
  // positivo silenciosamente.
  if (entrada.includes("-")) return null;

  const limpo = entrada.replace(/[^\d.,]/g, "");
  if (!/\d/.test(limpo)) return null;

  // Vírgula é sempre o separador decimal em pt-BR: só pode haver uma, e nada
  // de ponto depois dela. "1,2,3" e "1,50.00" são erro de digitação, não
  // valores — melhor pedir de novo do que adivinhar errado com dinheiro.
  const virgulas = (limpo.match(/,/g) ?? []).length;
  if (virgulas > 1) return null;
  if (virgulas === 1 && limpo.indexOf(".") > limpo.indexOf(",")) return null;

  let inteiros = limpo;
  let centavos = "";

  const posVirgula = limpo.indexOf(",");

  if (posVirgula !== -1) {
    // Vírgula em pt-BR é decimal, ponto final. Não existe "8,115" como oito
    // mil e cento e quinze — é digitação errada de 8,11 ou 8,15. Aceitar
    // silenciosamente multiplicaria a conta por mil.
    const depois = limpo.slice(posVirgula + 1);
    if (!/^\d{1,2}$/.test(depois)) return null;

    inteiros = limpo.slice(0, posVirgula);
    centavos = depois;
  } else {
    const posPonto = limpo.lastIndexOf(".");

    if (posPonto !== -1) {
      const depois = limpo.slice(posPonto + 1);

      if (/^\d{1,2}$/.test(depois)) {
        // Teclado numérico de celular costuma dar ponto: "12.50" é R$ 12,50.
        inteiros = limpo.slice(0, posPonto);
        centavos = depois;
      } else if (!/^\d{3}$/.test(depois)) {
        // Nem decimal nem grupo de milhar bem formado: não adivinhar.
        return null;
      }
    }
  }

  inteiros = inteiros.replace(/\D/g, "");
  if (!inteiros && !centavos) return null;

  const total = Number(`${inteiros || "0"}${centavos.padEnd(2, "0")}`);
  if (!Number.isSafeInteger(total)) return null;

  return total;
}

const hora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatarHora(iso: string): string {
  return hora.format(new Date(iso));
}

export function formatarDataHora(iso: string): string {
  return dataHora.format(new Date(iso));
}

/** Quanto falta para o link do cliente expirar (24h após o fechamento). */
export function tempoRestanteComprovante(fechadaEm: string | null): string | null {
  if (!fechadaEm) return null;
  const fim = new Date(fechadaEm).getTime() + 24 * 60 * 60 * 1000;
  const restanteMs = fim - Date.now();
  if (restanteMs <= 0) return null;
  const horas = Math.floor(restanteMs / (60 * 60 * 1000));
  const minutos = Math.floor((restanteMs % (60 * 60 * 1000)) / (60 * 1000));
  return horas > 0 ? `${horas}h${String(minutos).padStart(2, "0")}min` : `${minutos}min`;
}

/** Início do dia de hoje em São Paulo, como instante ISO (para o resumo do dia). */
export function inicioDoDiaLocalISO(): string {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
  // O Brasil está fixo em UTC-3 desde o fim do horário de verão (2019).
  return `${partes}T00:00:00-03:00`;
}
