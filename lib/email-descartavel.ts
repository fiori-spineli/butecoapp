import listaDescartaveis from "disposable-email-domains/index.json";
import listaCuringas from "disposable-email-domains/wildcard.json";

/**
 * Barreira contra e-mail temporário no cadastro.
 *
 * O objetivo é só um: garantir que a conta pertença a alguém que realmente
 * recebe e-mail, para o dono do bar não perder o acesso e para não sobrar
 * cadastro fantasma no banco. A confirmação por e-mail é a trava principal;
 * esta lista evita o gasto de mandar mensagem para caixa que se autodestrói
 * em dez minutos.
 *
 * A lista pública traz ~121 mil domínios (temp-mail.org, mailinator,
 * guerrillamail e afins) e o arquivo de curingas cobre os que trocam de
 * subdomínio o tempo todo.
 */

const DOMINIOS = new Set<string>(listaDescartaveis as string[]);
const CURINGAS = listaCuringas as string[];

/**
 * Complemento nosso: casos que a lista pública ainda não pegou quando esta
 * barreira foi escrita. Acrescentar aqui é mais rápido do que esperar o
 * upstream; se um dia entrar na lista oficial, o Set ignora a duplicata.
 */
const EXTRAS = [
  "tempmail.com",
  "temp-mail.io",
  "tempmailo.com",
  "tempr.email",
  "mail-temp.com",
  "minuteinbox.com",
  "emailfake.com",
];

for (const dominio of EXTRAS) DOMINIOS.add(dominio);

/** Formato aceitável de e-mail. Proposital: valida a forma, não a existência. */
const FORMATO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function normalizarEmail(bruto: string): string {
  return bruto.trim().toLowerCase();
}

export function formatoDeEmailValido(email: string): boolean {
  return FORMATO.test(email) && email.length <= 254;
}

function dominioDe(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}

/**
 * `true` quando o endereço é de um serviço descartável.
 *
 * Checa o domínio inteiro e também cada domínio-pai: alguns serviços entregam
 * endereços em subdomínio (`caixa.temp-mail.org`), e bloquear só o exato
 * deixaria a porta aberta.
 */
export function ehEmailDescartavel(email: string): boolean {
  const dominio = dominioDe(normalizarEmail(email));
  if (!dominio) return false;

  const partes = dominio.split(".");
  for (let i = 0; i < partes.length - 1; i++) {
    const candidato = partes.slice(i).join(".");
    if (DOMINIOS.has(candidato)) return true;
  }

  return CURINGAS.some(
    (curinga) => dominio === curinga || dominio.endsWith(`.${curinga}`),
  );
}

export type ProblemaNoEmail = "formato" | "descartavel" | null;

/** Passagem única usada pelas actions: devolve o problema, ou `null` se está ok. */
export function analisarEmail(bruto: string): {
  email: string;
  problema: ProblemaNoEmail;
} {
  const email = normalizarEmail(bruto);
  if (!formatoDeEmailValido(email)) return { email, problema: "formato" };
  if (ehEmailDescartavel(email)) return { email, problema: "descartavel" };
  return { email, problema: null };
}

export const MENSAGEM_DESCARTAVEL =
  "Esse endereço é de e-mail temporário. Use um e-mail de verdade — é por ele que você recupera o acesso ao bar se esquecer a senha.";
