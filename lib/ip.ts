import { createHash } from "node:crypto";
import { headers } from "next/headers";

/**
 * O IP de quem está pedindo, e o hash dele.
 *
 * Guardamos sempre o SHA-256, nunca o endereço — ver o comentário da migration
 * 0007. Serve para comparar, que é tudo o que os limites precisam, e não vira
 * um cadastro de onde nossos usuários moram caso o banco vaze.
 *
 * O sal vem do ambiente. Sem ele o hash continua comparável, mas fica
 * reversível por força bruta: o espaço de IPv4 tem 4 bilhões de endereços, o
 * que uma placa de vídeo varre em minutos. Defina IP_HASH_SALT em produção.
 */

/** Endereço bruto. Usado no Turnstile, que confere IP e token juntos. */
export async function ipDoVisitante(): Promise<string | null> {
  const cabecalhos = await headers();
  const bruto =
    cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    cabecalhos.get("x-real-ip")?.trim() ??
    "";

  return bruto || null;
}

export async function hashDoIpAtual(): Promise<string | null> {
  const bruto = await ipDoVisitante();
  if (!bruto) return null;

  const sal = process.env.IP_HASH_SALT ?? "buteco-sal-padrao";
  return createHash("sha256").update(`${sal}:${bruto}`).digest("hex");
}
