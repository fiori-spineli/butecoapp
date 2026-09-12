import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SESSAO_INDISPONIVEL, usuarioAtual } from "@/lib/supabase/usuario";
import type { Bar } from "@/lib/types";

/**
 * Sessão + bar do dono logado. Manda para /login quem não tem sessão.
 *
 * Quem NÃO tem sessão e quem a gente não conseguiu verificar são casos
 * diferentes (ver lib/supabase/usuario.ts). O segundo estoura, e aí o
 * app/error.tsx oferece "tentar de novo" — antes ele caía no mesmo
 * `redirect("/login")`, e uma instabilidade de dez segundos no provedor
 * deslogava todo mundo que estivesse com a tela aberta.
 */
export async function contextoDoDono() {
  const supabase = await createSupabaseServerClient();
  const { user, indisponivel } = await usuarioAtual(supabase);

  if (indisponivel) throw new Error(SESSAO_INDISPONIVEL);
  if (!user) redirect("/login");

  const { data: bar } = await supabase
    .from("bars")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  return { supabase, user, bar: (bar as Bar | null) ?? null };
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
