/**
 * Tetos de toda imagem que o servidor aceita — um lugar só.
 *
 * Moravam dentro da rota de foto de produto; a rota da foto do bar, escrita
 * depois, não tinha nenhum: aceitava arquivo de qualquer tamanho e entregava ao
 * sharp sem limite de pixels (auditoria de 2026-09-24). Duas rotas que fazem a
 * mesma coisa precisam ler o mesmo número.
 */

// O que chega é o recorte que o navegador já reduziu (editor de foto do
// produto, BarFotoForm) — poucas centenas de KB. O teto de 6 MB deixa folga
// para navegador sem WebP e ainda corta o envio gigante feito por fora da tela.
export const TAMANHO_MAXIMO_DA_IMAGEM = 6 * 1024 * 1024;

// Bomba de descompressão: um PNG de 1 MB pode abrir em 20.000×20.000 pixels e
// levar 1,6 GB de memória só para decodificar. Trinta megapixels é mais do
// que qualquer câmera de celular comum, e cabe folgado na função.
export const PIXELS_MAXIMOS_DA_IMAGEM = 30_000_000;

export const MENSAGEM_IMAGEM_GRANDE = "Essa imagem é grande demais (máximo 6 MB). Tente outra foto.";

export const MENSAGEM_IMAGEM_ILEGIVEL =
  "Não consegui ler essa imagem. Tente tirar a foto de novo ou escolher outra.";
