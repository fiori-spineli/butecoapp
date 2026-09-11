"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AVISO_SEM_SERVICE_ROLE,
  createSupabaseAdminClient,
  serviceRoleConfigurado,
} from "@/lib/supabase/admin";

/**
 * "Essa pessoa é admin?" — usado só para ROTEAR.
 *
 * Responde a partir da tabela `administradores`, sem exigir o segundo fator.
 * É o que decide se alguém vê a tela do painel (com o cadeado do 2FA na
 * frente) ou é mandado para o /dashboard. Não serve para liberar dado nenhum.
 */
export async function checarSeEhAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("administradores")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return Boolean(data);
}

/**
 * "Essa pessoa é admin E já digitou o código do segundo fator NESTA sessão?"
 *
 * Esta é a que libera dado e ação. A diferença entre as duas não é detalhe: o
 * painel mostrava a tela do 2FA, mas as server actions atrás dela só conferiam
 * a tabela `administradores`. Quem tivesse a senha do admin — e só a senha —
 * podia chamar cada uma delas direto, por POST, sem passar perto do
 * autenticador. O cadeado trancava a porta e deixava a janela aberta.
 *
 * O banco também passou a exigir `aal2` (migration 0011). São duas camadas de
 * propósito: esta aqui dá mensagem decente para quem está na tela, e a do
 * banco vale mesmo para quem chamar a API por fora do app.
 */
export async function exigirAdminVerificado(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: cargo } = await supabase
    .from("administradores")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!cargo) return false;

  const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return nivel?.currentLevel === "aal2";
}

/**
 * Manutenção do banco. A única ação hoje é `analisar`, que recalcula as
 * estatísticas do planejador — ver o comentário da migration 0007 sobre por
 * que a versão anterior (pg_stat_reset) fazia o contrário do que prometia.
 */
export async function dispararManutencao(acao: "analisar") {
  if (!(await exigirAdminVerificado())) {
    return { ok: false, mensagem: "Sessão sem segundo fator. Recarregue o painel e valide o código." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_executar_manutencao", { p_acao: acao });
  if (error) return { ok: false, mensagem: error.message };
  revalidatePath("/admin");
  return { ok: true, mensagem: data as string };
}

const BUCKET_DE_FOTOS = "produtos-imagens";

/** Foto mais nova que isto pode ser de um formulário ainda aberto. */
const IDADE_MINIMA_MS = 60 * 60 * 1000;

/**
 * Apaga do Storage as fotos que nenhum produto usa mais.
 *
 * Elas surgem de um jeito só: a pessoa sobe a foto (que já vai para o Storage
 * na hora, ver app/api/produtos/imagem/route.ts) e desiste do formulário sem
 * salvar. Foto salva substitui a anterior, então o resto do fluxo não deixa
 * sobra. Fotos com menos de uma hora ficam — podem ser de um cadastro em
 * andamento.
 *
 * Roda com a chave de serviço porque cruza todos os bares; o dono só enxerga
 * a própria pasta. Como toda ação do painel, exige o segundo fator.
 */
export async function limparFotosOrfas(): Promise<{ ok: boolean; mensagem: string }> {
  if (!(await exigirAdminVerificado())) {
    return { ok: false, mensagem: "Sessão sem segundo fator. Recarregue o painel e valide o código." };
  }
  if (!serviceRoleConfigurado()) {
    return { ok: false, mensagem: AVISO_SEM_SERVICE_ROLE };
  }

  const admin = createSupabaseAdminClient();

  const { data: bares, error: erroBares } = await admin.from("bars").select("id");
  if (erroBares || !bares) return { ok: false, mensagem: "Não consegui listar os bares." };

  const { data: produtos, error: erroProdutos } = await admin
    .from("produtos")
    .select("imagem_url")
    .not("imagem_url", "is", null);
  if (erroProdutos || !produtos) return { ok: false, mensagem: "Não consegui listar os produtos." };

  // A URL pública termina em `<bar>/<arquivo>.webp` — é essa a chave no Storage.
  const emUso = new Set<string>();
  for (const { imagem_url } of produtos) {
    const partes = String(imagem_url).split(`/${BUCKET_DE_FOTOS}/`);
    if (partes[1]) emUso.add(partes[1]);
  }

  const limite = Date.now() - IDADE_MINIMA_MS;
  let removidas = 0;
  let baresComSobra = 0;

  for (const { id } of bares) {
    const { data: arquivos, error } = await admin.storage.from(BUCKET_DE_FOTOS).list(id, { limit: 1000 });
    if (error || !arquivos) continue;

    const sobras = arquivos
      .filter((a) => !emUso.has(`${id}/${a.name}`))
      .filter((a) => !a.created_at || new Date(a.created_at).getTime() < limite)
      .map((a) => `${id}/${a.name}`);

    if (sobras.length === 0) continue;

    const { error: erroRemocao } = await admin.storage.from(BUCKET_DE_FOTOS).remove(sobras);
    if (erroRemocao) continue;

    removidas += sobras.length;
    baresComSobra += 1;
  }

  if (removidas === 0) return { ok: true, mensagem: "Nenhuma foto sobrando. Storage limpo." };
  return {
    ok: true,
    mensagem: `${removidas} foto${removidas === 1 ? "" : "s"} sem produto removida${removidas === 1 ? "" : "s"} (${baresComSobra} bar${baresComSobra === 1 ? "" : "es"}).`,
  };
}
