/**
 * A mensagem que acompanha o link quando o dono compartilha a comanda.
 *
 * No WhatsApp, o que chega ao cliente é este texto seguido do link. Antes era
 * "Sua conta no bar", fixo no código — impessoal, e o cliente não sabia nem de
 * que bar era. Agora o dono escreve a dele.
 */

/** Usada quando o bar não definiu nada. Serve sozinha, sem precisar editar. */
export const MENSAGEM_PADRAO =
  "Olá! Aqui está a sua comanda no {bar}. Toque no link para acompanhar o que já foi pedido — não precisa instalar nada nem criar conta.";

export const LIMITE_DE_CARACTERES = 300;

/**
 * Marcadores que o dono pode usar no texto. Ficam entre chaves porque é o que
 * a pessoa consegue digitar sem errar, e o app troca na hora de compartilhar.
 */
export const MARCADORES = [
  { chave: "{bar}", descricao: "nome do seu bar" },
  { chave: "{comanda}", descricao: "nome da comanda ou da mesa" },
] as const;

/**
 * Troca os marcadores pelos valores reais. Marcador desconhecido fica como
 * está: é melhor o dono ver o que digitou do que a mensagem sumir sem
 * explicação.
 */
export function montarMensagem(
  modelo: string | null | undefined,
  dados: { bar: string; comanda: string },
): string {
  const texto = (modelo ?? "").trim() || MENSAGEM_PADRAO;

  return texto
    .replaceAll("{bar}", dados.bar)
    .replaceAll("{comanda}", dados.comanda);
}
