/**
 * "Aberta há quanto tempo" — a conta que o dono do bar faz de cabeça o dia
 * inteiro e sempre erra no fim da noite.
 *
 * A escala vai de segundos a meses porque comanda esquecida existe: mesa que
 * ficou aberta o fim de semana inteiro precisa gritar isso, e "aberta desde
 * 12/03" não grita. "3sem 2d" grita.
 *
 * Funções puras, com o instante de agora recebido por parâmetro: é o que
 * permite o componente cliente recalcular a cada tique sem recriar nada, e o
 * que torna o resultado previsível fora do navegador.
 */

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const SEMANA = 7 * DIA;
/** Mês comercial. Conta de bar não precisa de calendário gregoriano. */
const MES = 30 * DIA;

/**
 * Duração compacta, com duas unidades no máximo.
 *
 * Duas e não três porque a terceira nunca muda a decisão de ninguém: entre
 * "2h 15min" e "2h 15min 8s", a segunda só pisca mais.
 */
export function descreverDuracao(intervaloMs: number): string {
  // Relógio do aparelho atrasado em relação ao servidor deixaria o número
  // negativo por alguns segundos. Melhor mostrar "agora" do que "-3s".
  const ms = Math.max(0, intervaloMs);

  if (ms < MINUTO) {
    return `${Math.floor(ms / SEGUNDO)}s`;
  }

  if (ms < HORA) {
    const minutos = Math.floor(ms / MINUTO);
    const segundos = Math.floor((ms % MINUTO) / SEGUNDO);
    return `${minutos}min ${segundos}s`;
  }

  if (ms < DIA) {
    const horas = Math.floor(ms / HORA);
    const minutos = Math.floor((ms % HORA) / MINUTO);
    return `${horas}h ${minutos}min`;
  }

  if (ms < SEMANA) {
    const dias = Math.floor(ms / DIA);
    const horas = Math.floor((ms % DIA) / HORA);
    return `${dias}d ${horas}h`;
  }

  if (ms < MES) {
    const semanas = Math.floor(ms / SEMANA);
    const dias = Math.floor((ms % SEMANA) / DIA);
    return `${semanas}sem ${dias}d`;
  }

  const meses = Math.floor(ms / MES);
  const semanas = Math.floor((ms % MES) / SEMANA);
  const rotulo = meses === 1 ? "mês" : "meses";
  return semanas > 0 ? `${meses} ${rotulo} ${semanas}sem` : `${meses} ${rotulo}`;
}

/**
 * De quanto em quanto tempo vale recalcular.
 *
 * Uma comanda aberta há três semanas não muda de texto num segundo, e um
 * `setInterval` de 1s por cartão numa tela com trinta comandas é bateria do
 * celular do dono indo embora à toa.
 */
export function intervaloDeAtualizacao(intervaloMs: number): number {
  if (intervaloMs < HORA) return SEGUNDO;
  if (intervaloMs < DIA) return 30 * SEGUNDO;
  return 5 * MINUTO;
}
