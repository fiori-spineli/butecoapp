/**
 * Regras da senha do dono — um lugar só, lido pela tela e pelo servidor.
 *
 * A tela usa estas mesmas regras para acender o checklist enquanto a pessoa
 * digita; o servidor usa de novo antes de gravar, porque a tela é só conforto
 * e a action pode ser chamada por fora dela.
 *
 * O que ficou de fora de propósito: exigir símbolo e maiúscula. Isso empurra
 * gente para "Senha@123", que é justamente a primeira que um robô tenta. O que
 * protege de verdade é comprimento, não repetir o e-mail e não estar na lista
 * das senhas que todo mundo usa.
 */

export const SENHA_MINIMO = 8;

/**
 * O bcrypt, que o Supabase usa para guardar a senha, só enxerga os primeiros
 * 72 bytes. Acima disso o resto é ignorado em silêncio — duas senhas diferentes
 * passariam a valer igual. O Auth recusa, mas a mensagem dele sai em inglês.
 */
export const SENHA_MAXIMO_BYTES = 72;

/** As que aparecem no topo de todo vazamento, adaptadas para o português. */
const SENHAS_OBVIAS = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000",
  "12341234", "abcd1234", "abc12345", "a1b2c3d4", "qwerty12", "qwerty123",
  "password", "password1", "senha123", "senha1234", "mudar123", "trocar123",
  "brasil123", "buteco123", "butecoapp", "cerveja123", "flamengo1", "corinthians",
  "palmeiras1", "iloveyou1", "admin123", "admin1234", "bar12345", "boteco123",
]);

export type RegraDaSenha = { id: string; texto: string; ok: boolean };

function bytes(texto: string): number {
  return new TextEncoder().encode(texto).length;
}

/** Cada regra com o seu estado — é o que a tela desenha como checklist. */
export function regrasDaSenha(senha: string): RegraDaSenha[] {
  return [
    { id: "tamanho", texto: `Pelo menos ${SENHA_MINIMO} caracteres`, ok: senha.length >= SENHA_MINIMO },
    { id: "letra", texto: "Pelo menos uma letra", ok: /\p{L}/u.test(senha) },
    { id: "numero", texto: "Pelo menos um número", ok: /\d/.test(senha) },
  ];
}

/**
 * Devolve o motivo de recusa, ou null se a senha serve.
 *
 * Espaço no começo ou no fim é recusado em vez de cortado: cortar calado foi
 * o que fez uma senha gravada no painel não bater com a digitada no login.
 * Recusar deixa a pessoa ver o problema na hora.
 */
export function problemaDaSenha(senha: string, email?: string | null): string | null {
  if (senha !== senha.trim()) {
    return "A senha não pode começar nem terminar com espaço.";
  }

  const falhou = regrasDaSenha(senha).find((regra) => !regra.ok);
  if (falhou) return `A senha precisa ter: ${falhou.texto.toLowerCase()}.`;

  if (bytes(senha) > SENHA_MAXIMO_BYTES) {
    return "A senha ficou longa demais. Use até 64 caracteres.";
  }

  const minuscula = senha.toLowerCase();
  if (SENHAS_OBVIAS.has(minuscula) || /^(.)\1+$/.test(senha)) {
    return "Essa senha é das primeiras que um invasor tenta. Escolha outra.";
  }

  const usuario = email?.split("@")[0]?.toLowerCase();
  if (usuario && usuario.length >= 4 && minuscula.includes(usuario)) {
    return "A senha não pode conter o seu e-mail.";
  }

  return null;
}
