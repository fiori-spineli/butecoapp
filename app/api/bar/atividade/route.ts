import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SEM_CACHE = { "Cache-Control": "private, no-store" } as const;

/**
 * "Mudou alguma coisa no meu bar?" em 32 caracteres.
 *
 * As telas do dono perguntam por aqui de segundo em segundo e só recarregam
 * quando a resposta muda (ver components/atualizacao-ao-vivo.tsx). Antes elas
 * recarregavam a rota inteira a cada ciclo, mudando algo ou não: mais lento
 * para quem olha e mais caro para o servidor ao mesmo tempo.
 *
 * Não há checagem de sessão escrita aqui de propósito. Quem autoriza é o
 * banco: `atividade_do_bar()` roda como o próprio usuário (security invoker),
 * enxerga só o que o RLS deixaria, e o `anon` não tem permissão de executá-la
 * (migration 0015). Chamar `getUser()` a cada pergunta acrescentaria uma ida à
 * API de autenticação por segundo, por aba — o custo que esta rota existe para
 * evitar.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("atividade_do_bar");

  if (error) {
    // Sem sessão válida a função é negada — daí 401, que o cliente entende
    // como "parei de acompanhar" em vez de ficar tentando para sempre.
    return NextResponse.json({ erro: "sem acesso" }, { status: 401, headers: SEM_CACHE });
  }

  return NextResponse.json({ assinatura: data }, { headers: SEM_CACHE });
}
