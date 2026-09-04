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

/** "12,50" ou "12,5" ou "R$ 12,50" -> 1250 centavos. Retorna null se inválido. */
export function parseReaisParaCentavos(entrada: string): number | null {
  const limpo = entrada
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  if (!limpo) return null;
  const valor = Number(limpo);
  if (!Number.isFinite(valor) || valor < 0) return null;
  return Math.round(valor * 100);
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
