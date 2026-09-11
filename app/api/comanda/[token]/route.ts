import { NextResponse } from "next/server";
import { createSupabaseAnonClient } from "@/lib/supabase/publico";

const TOKEN_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A comanda do cliente, para a atualização ao vivo de /c/[token].
 *
 * Antes o navegador chamava a API do Supabase direto. A Content-Security-Policy
 * (lib/csp.ts) só deixa o navegador falar com a própria origem — e a tela
 * parou de atualizar em silêncio. Passar por aqui mantém a regra ("o
 * navegador não fala com o Supabase") e ainda tira o supabase-js do bundle da
 * página que um estranho abre no wifi do bar.
 *
 * Mesma função do banco, mesma garantia: `comanda_publica(token)` é o único
 * acesso do anônimo, e só àquela comanda. Token que não é UUID nem chega ao
 * banco.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!TOKEN_UUID.test(token)) {
    return NextResponse.json(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }

  const { data, error } = await createSupabaseAnonClient().rpc("comanda_publica", { p_token: token });

  if (error) {
    return NextResponse.json({ erro: "indisponível" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }

  // `null` = token que não existe mais (comprovante expirou). É resposta, não erro.
  return NextResponse.json(data ?? null, { headers: { "Cache-Control": "private, no-store" } });
}
