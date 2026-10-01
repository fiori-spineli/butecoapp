import { redirect } from "next/navigation";
import { getNeonSession } from "@/lib/neon-session";
import { neonPool } from "@/lib/neon-db";
import type { Bar } from "@/lib/types";

/**
 * Sessão + bar do dono logado. Manda para /login quem não tem sessão.
 *
 * A sessão é conferida no Neon antes da consulta ao bar. Todas as leituras
 * de negócio usam o identificador do bar obtido aqui, nunca do formulário.
 */
export async function contextoDoDono() {
  const session = await getNeonSession();
  if (!session) redirect("/login");
  const { rows } = await neonPool.query<Bar>(
    "SELECT * FROM public.bars WHERE owner_id = $1 ORDER BY created_at LIMIT 1",
    [session.userId],
  );
  return {
    user: { id: session.userId, email: session.email },
    bar: rows[0] ?? null,
  };
}

/** Igual ao anterior, mas exige que o bar já exista (senão manda pro onboarding). */
export async function exigirBar() {
  const contexto = await contextoDoDono();
  if (!contexto.bar) redirect("/onboarding");
  return { ...contexto, bar: contexto.bar };
}

/** Remove acentos sem depender de faixas Unicode escritas à mão. */
function semAcentos(texto: string): string {
  return texto
    .normalize("NFD")
    .split("")
    .filter((caractere) => {
      const ponto = caractere.codePointAt(0) ?? 0;
      const ehDiacritico = ponto >= 0x0300 && ponto <= 0x036f;
      return !ehDiacritico;
    })
    .join("");
}

export function gerarSlug(nome: string): string {
  const base = semAcentos(nome)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const sufixo = Math.random().toString(36).slice(2, 7);
  return `${base || "buteco"}-${sufixo}`;
}
