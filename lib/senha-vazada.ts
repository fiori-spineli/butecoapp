import { createHash } from "node:crypto";

/**
 * A senha já apareceu em vazamento de outro site?
 *
 * É a "proteção contra senha vazada" que banco e loja grande fazem, e que o
 * Supabase só liga no plano Pro (advisor auth_leaked_password_protection). A
 * consulta é a do HaveIBeenPwned por k-anonimato: sai do servidor só o começo
 * (5 caracteres) do SHA-1 da senha; a resposta traz todos os finais que
 * começam assim, e a comparação acontece aqui. Nem a senha nem o hash inteiro
 * deixam o servidor.
 *
 * Falha ABERTA, de propósito: se o serviço não responder em 3 s, a senha
 * passa. Isto é uma camada a mais sobre as regras de lib/senha.ts, não a
 * trava — e ninguém pode ficar sem conseguir criar senha porque um site de
 * terceiros caiu. O prazo segue a regra de GUARDRAILS.md seção 12: toda espera
 * tem prazo.
 *
 * Só roda no servidor (node:crypto); a tela usa lib/senha.ts.
 */
export async function senhaApareceEmVazamento(senha: string): Promise<boolean> {
  const hash = createHash("sha1").update(senha, "utf8").digest("hex").toUpperCase();
  const prefixo = hash.slice(0, 5);
  const sufixo = hash.slice(5);

  const controle = new AbortController();
  const prazo = setTimeout(() => controle.abort(), 3000);
  try {
    const resposta = await fetch(`https://api.pwnedpasswords.com/range/${prefixo}`, {
      // Com preenchimento, o tamanho da resposta não revela qual prefixo foi.
      headers: { "Add-Padding": "true", "User-Agent": "ButecoApp" },
      signal: controle.signal,
      cache: "no-store",
    });
    if (!resposta.ok) return false;

    const corpo = await resposta.text();
    return corpo.split("\n").some((linha) => {
      const [final, vezes] = linha.trim().split(":");
      // As linhas de preenchimento vêm com contagem 0.
      return final === sufixo && Number(vezes) > 0;
    });
  } catch {
    return false;
  } finally {
    clearTimeout(prazo);
  }
}

export const MENSAGEM_SENHA_VAZADA =
  "Essa senha já apareceu em vazamentos de outros sites, e é das primeiras que um invasor tenta. Escolha outra.";
