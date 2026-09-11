"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { exigirAdminVerificado } from "@/app/actions/admin";
import { createSupabaseAdminClient, serviceRoleConfigurado } from "@/lib/supabase/admin";
import { gerarSlug } from "@/lib/bar";
import { origemDoApp } from "@/lib/url";
import { analisarEmail, MENSAGEM_DESCARTAVEL } from "@/lib/email-descartavel";
import type { EstadoForm } from "@/app/actions/auth";

/**
 * Gestão dos nossos clientes — os donos de bar.
 *
 * O que o backoffice PODE fazer: criar o acesso, renomear o bar, suspender,
 * reativar, gerar link de acesso e excluir o cliente inteiro.
 *
 * O que ele NÃO faz, de propósito: entrar nas comandas, ver faturamento, mexer
 * em produto ou em pagamento. Somos o fornecedor do sistema, não sócios do bar.
 * O dinheiro que passa por ali é do dono, e a única coisa que precisamos saber
 * sobre ele é se está usando o produto — por isso o painel mostra "última
 * atividade" e contagem de comandas, e não valores.
 *
 * Toda função começa por `exigirAdminVerificado()`: admin COM segundo fator
 * validado nesta sessão. Ver o comentário em app/actions/admin.ts.
 */

const NEGADO: EstadoForm = {
  ok: false,
  mensagem: "Acesso negado. Recarregue o painel e valide o código do segundo fator.",
};

const SEM_CHAVE: EstadoForm = {
  ok: false,
  mensagem:
    "SUPABASE_SERVICE_ROLE_KEY ausente neste ambiente. Sem ela o painel não cria nem remove contas.",
};

/**
 * Gera o link de definir senha e DEVOLVE a URL, em vez de mandar e-mail.
 *
 * Duas paredes derrubaram o caminho do e-mail, e as duas de uma vez:
 *
 * 1. O Turnstile passou a proteger o endpoint /recover do Supabase. O widget
 *    vive no navegador; o backoffice roda no servidor e não tem como produzir
 *    token. Descoberto no QA: a conta era criada e o e-mail voltava
 *    "captcha protection: request disallowed (no captcha_token found)" — conta
 *    criada, dono sem meio de entrar.
 * 2. Sem domínio próprio verificado no Resend, o remetente de teste só entrega
 *    para o dono da conta. Ou seja: mesmo sem o captcha, o e-mail não chegaria
 *    a um bar novo.
 *
 * `generateLink` é da API de administração e não passa por captcha nenhum. Com
 * o hashed_token a gente monta a MESMA URL que o template de e-mail montaria, e
 * o admin manda pelo WhatsApp — que é por onde ele já está falando com o dono.
 *
 * Quando houver domínio verificado, dá para voltar a enviar sozinho; o link
 * continua o mesmo.
 */
async function gerarLinkDeSenha(email: string): Promise<string | null> {
  try {
    const { data, error } = await createSupabaseAdminClient().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${await origemDoApp()}/auth/callback` },
    });

    const hash = data?.properties?.hashed_token;
    if (error || !hash) return null;

    return `${await origemDoApp()}/auth/callback?token_hash=${hash}&type=recovery`;
  } catch {
    return null;
  }
}

/**
 * Cria a conta de um bar: usuário + estabelecimento + link de senha.
 *
 * Os dois caminhos do painel passam por aqui — o que nasce de um pedido na fila
 * e o que o admin digita do zero. Um bar sem dono e um dono sem bar são os dois
 * estados quebrados possíveis, então a função desfaz o usuário se o bar falhar.
 */
async function provisionarBar(
  nomeDoBar: string,
  email: string,
): Promise<
  { ok: true; barId: string; link: string | null } | { ok: false; mensagem: string }
> {
  const admin = createSupabaseAdminClient();

  const { data: criado, error: erroUsuario } = await admin.auth.admin.createUser({
    email,
    // Senha longa e descartável só para o usuário nascer completo; quem define
    // a de verdade é o dono, pelo link. Nem nós vemos esta.
    password: randomBytes(32).toString("base64url"),
    // Já falamos com essa pessoa — o e-mail foi conferido fora do sistema.
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
        ? "Já existe uma conta com esse e-mail."
        : "Não consegui criar o usuário. Tente novamente.",
    };
  }

  const { data: barCriado, error: erroBar } = await admin
    .from("bars")
    .insert({ owner_id: criado.user.id, nome: nomeDoBar, slug: gerarSlug(nomeDoBar) })
    .select("id")
    .single();

  if (erroBar || !barCriado) {
    await admin.auth.admin.deleteUser(criado.user.id);
    return { ok: false, mensagem: "Criei o usuário mas não consegui criar o bar. Nada foi salvo." };
  }

  return { ok: true, barId: barCriado.id, link: await gerarLinkDeSenha(email) };
}

/** Cadastro direto, sem passar pela fila de interessados. */
export async function criarClienteDoZero(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdminVerificado())) return NEGADO;
  if (!serviceRoleConfigurado()) return SEM_CHAVE;

  const nomeDoBar = String(formData.get("bar_nome") ?? "").trim();
  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));

  if (nomeDoBar.length < 2) return { ok: false, mensagem: "Informe o nome do bar." };
  if (nomeDoBar.length > 120) return { ok: false, mensagem: "O nome do bar ficou longo demais." };
  if (problema === "formato") return { ok: false, mensagem: "Digite um e-mail válido." };
  if (problema === "descartavel") return { ok: false, mensagem: MENSAGEM_DESCARTAVEL };

  const resultado = await provisionarBar(nomeDoBar, email);
  if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem };

  revalidatePath("/admin");
  return {
    ok: true,
    mensagem: resultado.link
      ? `"${nomeDoBar}" criado. Mande este link para o dono definir a senha: ${resultado.link}`
      : `"${nomeDoBar}" criado, mas não consegui gerar o link. Use "Gerar link de acesso" na lista.`,
  };
}

/** Corrige o nome do bar — erro de digitação no cadastro é o caso comum. */
export async function renomearBar(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdminVerificado())) return NEGADO;
  if (!serviceRoleConfigurado()) return SEM_CHAVE;

  const barId = String(formData.get("bar_id") ?? "").trim();
  const nome = String(formData.get("bar_nome") ?? "").trim();

  if (!barId) return { ok: false, mensagem: "Bar não informado." };
  if (nome.length < 2) return { ok: false, mensagem: "O nome do bar é obrigatório." };
  if (nome.length > 120) return { ok: false, mensagem: "O nome do bar ficou longo demais." };

  // O slug NÃO é regerado: ele não aparece em lugar nenhum para o cliente e
  // mudá-lo só criaria divergência com o que já foi gravado.
  const { error } = await createSupabaseAdminClient()
    .from("bars")
    .update({ nome })
    .eq("id", barId);

  if (error) return { ok: false, mensagem: "Não consegui renomear." };

  revalidatePath("/admin");
  return { ok: true, mensagem: `Bar renomeado para "${nome}".` };
}

/**
 * Suspende ou reativa o acesso, sem apagar nada.
 *
 * É o meio-termo que faltava entre "deixa como está" e "exclui tudo": o dono
 * para de conseguir entrar, mas comandas, produtos e histórico continuam
 * intactos esperando. Para inadimplência ou uso indevido, é isto que se usa —
 * exclusão é irreversível e não deveria ser o primeiro recurso.
 *
 * Por baixo é o `ban_duration` do Supabase. "none" levanta o bloqueio.
 */
export async function alternarSuspensao(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdminVerificado())) return NEGADO;
  if (!serviceRoleConfigurado()) return SEM_CHAVE;

  const ownerId = String(formData.get("owner_id") ?? "").trim();
  const suspender = String(formData.get("suspender") ?? "") === "1";

  if (!ownerId) return { ok: false, mensagem: "Dono não informado." };

  const { error } = await createSupabaseAdminClient().auth.admin.updateUserById(ownerId, {
    // 100 anos é o jeito do Supabase de dizer "até segunda ordem".
    ban_duration: suspender ? "876000h" : "none",
  });

  if (error) return { ok: false, mensagem: "Não consegui mudar a suspensão." };

  revalidatePath("/admin");
  return {
    ok: true,
    mensagem: suspender
      ? "Acesso suspenso. Os dados do bar continuam salvos."
      : "Acesso reativado.",
  };
}

/** Gera um link novo de definir senha, para copiar e mandar ao dono. */
export async function gerarLinkDeAcesso(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdminVerificado())) return NEGADO;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { ok: false, mensagem: "E-mail não informado." };

  const link = await gerarLinkDeSenha(email);
  return link
    ? { ok: true, mensagem: link }
    : { ok: false, mensagem: "Não consegui gerar o link agora. Tente de novo." };
}

/**
 * Exclui o cliente inteiro. Não tem volta.
 *
 * Apaga o usuário no Auth, e o banco leva o resto junto pelas chaves
 * estrangeiras: bar, comandas, produtos, lançamentos e pagamentos. As fotos no
 * Storage não seguem essa cascata, então são removidas à mão aqui — senão
 * ficariam ocupando espaço para sempre, sem dono.
 *
 * A confirmação exige digitar o nome do bar. Um "tem certeza?" é clicado no
 * automático; digitar o nome obriga a olhar qual linha está selecionada.
 */
export async function excluirCliente(
  _anterior: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  if (!(await exigirAdminVerificado())) return NEGADO;
  if (!serviceRoleConfigurado()) return SEM_CHAVE;

  const barId = String(formData.get("bar_id") ?? "").trim();
  const ownerId = String(formData.get("owner_id") ?? "").trim();
  const nomeEsperado = String(formData.get("bar_nome") ?? "").trim();
  const confirmacao = String(formData.get("confirmacao") ?? "").trim();

  if (!barId || !ownerId) return { ok: false, mensagem: "Cliente não identificado." };

  if (confirmacao.toLowerCase() !== nomeEsperado.toLowerCase()) {
    return {
      ok: false,
      mensagem: `Para excluir, digite exatamente o nome do bar: ${nomeEsperado}`,
    };
  }

  const admin = createSupabaseAdminClient();

  // As fotos primeiro: depois de apagar o bar, não há mais como saber a pasta.
  try {
    const { data: arquivos } = await admin.storage.from("produtos-imagens").list(barId);
    if (arquivos?.length) {
      await admin.storage
        .from("produtos-imagens")
        .remove(arquivos.map((a) => `${barId}/${a.name}`));
    }
  } catch {
    // Foto órfã é sujeira, não é bloqueio. A exclusão segue.
  }

  const { error } = await admin.auth.admin.deleteUser(ownerId);
  if (error) return { ok: false, mensagem: "Não consegui excluir a conta." };

  revalidatePath("/admin");
  return { ok: true, mensagem: `"${nomeEsperado}" foi excluído junto com todos os dados.` };
}

/** Usado pela fila de interessados: cria o bar e dá baixa no pedido. */
export async function criarClienteDoPedido(
  interessadoId: string,
  nomeDoBar: string,
  email: string,
): Promise<EstadoForm> {
  const resultado = await provisionarBar(nomeDoBar, email);
  if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem };

  await createSupabaseAdminClient()
    .from("interessados")
    .update({
      status: "convertido",
      bar_id: resultado.barId,
      atendido_em: new Date().toISOString(),
    })
    .eq("id", interessadoId);

  revalidatePath("/admin");
  return {
    ok: true,
    mensagem: resultado.link
      ? `Bar "${nomeDoBar}" criado. Mande este link para o dono definir a senha: ${resultado.link}`
      : `Bar "${nomeDoBar}" criado, mas não consegui gerar o link. Use "Gerar link de acesso" na lista de clientes.`,
  };
}
