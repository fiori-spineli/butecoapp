/**
 * Telefone brasileiro — o campo obrigatório do formulário de interesse.
 *
 * É por ele que a gente liga de volta, então vale conferir de verdade em vez
 * de aceitar qualquer string: um "telefone" com 5 dígitos é um contato que
 * nunca vai ser atendido, e a gente só descobre na hora de ligar.
 */

/** Só os dígitos, já sem o +55 e sem o zero de operadora. */
export function apenasDigitos(entrada: string): string {
  let digitos = entrada.replace(/\D/g, "");

  // +55 11 9... — o código do país vem colado quando a pessoa copia do WhatsApp.
  if (digitos.length > 11 && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }

  // 0 11 9... — o zero de seleção de operadora não faz parte do número.
  if (digitos.length === 11 && digitos.startsWith("0")) {
    digitos = digitos.slice(1);
  }
  if (digitos.length === 12 && digitos.startsWith("0")) {
    digitos = digitos.slice(1);
  }

  return digitos;
}

/**
 * Normaliza para gravar. `null` quando não dá para acreditar no número.
 *
 * Aceita 10 dígitos (fixo com DDD) e 11 (celular com DDD, que sempre começa
 * com 9 depois do DDD). DDD válido no Brasil vai de 11 a 99 — nenhum começa
 * com 0 ou 1 no segundo dígito é falso, então checamos só a faixa.
 */
export function normalizarTelefone(entrada: string): string | null {
  const digitos = apenasDigitos(entrada);

  if (digitos.length !== 10 && digitos.length !== 11) return null;

  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;

  // Celular no Brasil tem o nono dígito e ele é sempre 9.
  if (digitos.length === 11 && digitos[2] !== "9") return null;

  // Fixo nunca começa com 0 nem 1 depois do DDD.
  if (digitos.length === 10 && (digitos[2] === "0" || digitos[2] === "1")) return null;

  return digitos;
}

/** (11) 91234-5678 — como o dono do bar espera ver na tela do painel. */
export function formatarTelefone(digitos: string): string {
  const limpo = apenasDigitos(digitos);

  if (limpo.length === 11) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  }
  if (limpo.length === 10) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  }
  return digitos;
}

/** Link de WhatsApp para o botão do backoffice. */
export function linkWhatsApp(digitos: string, mensagem?: string): string {
  const limpo = apenasDigitos(digitos);
  const base = `https://wa.me/55${limpo}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}
