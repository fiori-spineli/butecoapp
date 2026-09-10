"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { exigirAdminVerificado } from "@/app/actions/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, serviceRoleConfigurado } from "@/lib/supabase/admin";
import { gerarSlug } from "@/lib/bar";
import { origemDoApp } from "@/lib/url";
import type { EstadoForm } from "@/app/actions/auth";
import type { Interessado } from "@/lib/types";

/**
 * O backoffice: é aqui, e só aqui, que um bar novo passa a existir.
 *
 * Toda função deste arquivo começa conferindo se quem chamou é admin **com o
 * segundo fator já validado nesta sessão**. A chave `service_role` que vem
 * depois ignora RLS por completo — ela é o que executa, nunca o que autoriza.
 * Sem essa checagem no topo, uma server action é uma URL pública como outra
 * qualquer, e quem tivesse só a senha do admin criaria contas à vontade.
 */
async function exigirAdmin(): Promise<boolean> {
  return exigirAdminVerificado();
}

const NEGADO: EstadoForm = {
  ok: false,
  mensagem: "Acesso negado. Recarregue o painel e valide o código do segundo fator.",
};

/** A fila, do mais novo para o mais velho, com os pendentes na frente. */
export async function listarInteressados(): Promise<Interessado[]> {
  if (!(await exigirAdmin())) return [];

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("interessados")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []) as Interessado[];
}

/**
 * Cria a conta do bar a partir de um pedido.
 *
 * Três escritas que precisam acontecer juntas: o usuário no Auth, o bar no
 * banco e a baixa no pedido. Não há transação possível entre o Auth e o
 * Postgres, então a ordem é escolhida para que uma falha no meio deixe o
 * estado mais fácil de entender: se o bar falhar, o usuário criado é apagado
 * de volta, e o pedido continua na fila como se nada tivesse acontecido.
 *
 * A senha nasce aleatória e ninguém nunca a vê — nem nós. Quem define a senha
 * de verdade é o dono, pelo link que sai por e-mail logo em seguida. Mandar
 * senha provisória por e-mail seria entregar a conta a quem lê a caixa postal
 * no caminho.
 */
export async function criarContaDoBar(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdmin())) return NEGADO;

  if (!serviceRoleConfigurado()) {
    return {
      ok: false,
      mensagem:
        "SUPABASE_SERVICE_ROLE_KEY não está definida neste ambiente. Sem ela não dá para criar contas.",
    };
  }

  const interessadoId = String(formData.get("interessado_id") ?? "").trim();
  const nomeDoBar = String(formData.get("bar_nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!interessadoId || !nomeDoBar || !email) {
    return { ok: false, mensagem: "Faltou o nome do bar ou o e-mail." };
  }

  const admin = createSupabaseAdminClient();

  // Senha longa e descartável só para o usuário nascer completo. Ela é
  // substituída pelo dono no primeiro acesso.
  const senhaDescartavel = randomBytes(32).toString("base64url");

  const { data: criado, error: erroUsuario } = await admin.auth.admin.createUser({
    email,
    password: senhaDescartavel,
    // Nós já falamos com essa pessoa: o e-mail está conferido fora do sistema.
    // Deixar sem confirmar obrigaria ela a caçar um segundo e-mail antes de
    // conseguir o primeiro login.
    email_confirm: true,
    user_metadata: { bar_nome: nomeDoBar, criado_por: "backoffice" },
  });

  if (erroUsuario || !criado?.user) {
    const jaExiste =
      erroUsuario?.code === "email_exists" ||
      /already (been )?registered|already exists/i.test(erroUsuario?.message ?? "");

    return {
      ok: false,
      mensagem: jaExiste
        ? "Já existe uma conta com esse e-mail. Confira no painel do Supabase antes de criar outra."
        : "Não consegui criar o usuário. Tente novamente.",
    };
  }

  const { data: barCriado, error: erroBar } = await admin
    .from("bars")
    .insert({ owner_id: criado.user.id, nome: nomeDoBar, slug: gerarSlug(nomeDoBar) })
    .select("id")
    .single();

  if (erroBar || !barCriado) {
    // Desfaz o usuário: uma conta que entra e cai no "sua conta não tem bar" é
    // pior do que nenhuma conta, porque parece sistema quebrado.
    await admin.auth.admin.deleteUser(criado.user.id);
    return { ok: false, mensagem: "Criei o usuário mas não consegui criar o bar. Nada foi salvo." };
  }

  await admin
    .from("interessados")
    .update({
      status: "convertido",
      bar_id: barCriado.id,
      atendido_em: new Date().toISOString(),
    })
    .eq("id", interessadoId);

  // O link de definir senha usa o mesmo caminho do "esqueci a senha": cai em
  // /auth/callback, que reconhece o tipo `recovery` e leva para /nova-senha.
  const supabase = await createSupabaseServerClient();
  const { error: erroEmail } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origemDoApp()}/auth/callback`,
  });

  revalidatePath("/admin");

  if (erroEmail) {
    return {
      ok: true,
      mensagem: `Bar "${nomeDoBar}" criado. Mas o e-mail para definir a senha não saiu — mande o link de "Esqueceu a senha?" para ${email}.`,
    };
  }

  return {
    ok: true,
    mensagem: `Bar "${nomeDoBar}" criado e link para definir a senha enviado para ${email}.`,
  };
}

/** Marca o pedido como contatado ou descartado, com uma nota do que foi conversado. */
export async function mudarStatusInteressado(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdmin())) return NEGADO;

  const id = String(formData.get("interessado_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim();

  if (!id || !["novo", "contatado", "descartado"].includes(status)) {
    return { ok: false, mensagem: "Situação inválida." };
  }

  // Sem service_role aqui de propósito: a policy da migration 0010 já deixa o
  // admin atualizar a tabela com a própria sessão. Chave que ignora RLS só
  // entra onde o RLS realmente atrapalha.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("interessados")
    .update({
      status,
      observacao: observacao || null,
      atendido_em: status === "novo" ? null : new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, mensagem: "Não consegui salvar a mudança." };

  revalidatePath("/admin");
  return { ok: true, mensagem: "Pedido atualizado." };
}
