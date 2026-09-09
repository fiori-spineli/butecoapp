export const FRASES_BUTECO = [
  "Tirando o colarinho do chopp...",
  "Limpando o balcão com o pano...",
  "Pegando o giz da lousa...",
  "Abrindo a conta na caderneta...",
  "Chamando o garçom...",
  "Fritando a porção de torresmo...",
  "Passando o pano na mesa 4...",
  "Calculando o troco no guardanapo...",
  "Gelando a próxima garrafa...",
  "Anotando o pedido atrás do recibo...",
];

export function fraseAleatoria(): string {
  return FRASES_BUTECO[Math.floor(Math.random() * FRASES_BUTECO.length)];
}