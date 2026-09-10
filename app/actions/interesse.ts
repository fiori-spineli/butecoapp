"use server";

import { MENSAGEM_DESCARTAVEL, analisarEmail } from "@/lib/email-descartavel";
import { hashDoIpAtual, ipDoVisitante } from "@/lib/ip";
import { normalizarTelefone } from "@/lib/telefone";
import { conferirTurnstile } from "@/lib/turnstile";
import { avisarSobreInteresse } from "@/lib/aviso-interesse";
import { CAMPO_ARMADILHA } from "@/lib/armadilha";
import { createSupabaseAdminClient, serviceRoleConfigurado } from "@/lib/supabase/admin";

export type EstadoInteresse = { ok: boolean; mensagem: string } | null;

const AGRADECIMENTO =
  "Recebido! Vamos falar com você pelo telefone ou pelo e-mail informado, normalmente no mesmo dia.";

/**
 * Pedido de um bar interessado.
 *
 * Quatro camadas, nesta ordem — da mais barata para a mais cara:
 *
 * 1. Honeypot: campo invisível preenchido = robô.
 * 2. Turnstile: prova de que existe um navegador de verdade do outro lado.
 * 3. Validação de e-mail (formato + descartável) e de telefone brasileiro.
 * 4. Limite de 3 por IP por dia, conferido dentro do banco.
 *
 * E uma quinta, que é estrutural: a função que grava só é executável pelo
 * `service_role`. A chave anônima do app não alcança ela, então não existe
 * "chamar a API direto e pular o formulário" — ver a migration 0010.
 */
export async function registrarInteresse(
  _anterior: EstadoInteresse,
  formData: FormData,
): Promise<EstadoInteresse> {
  // 1. Armadilha.
  //
  // Devolve o MESMO texto de sucesso que uma pessoa veria, e não grava nada.
  // Dizer "você é um robô" ensina quem escreveu o robô a consertá-lo; fingir
  // que deu certo faz ele ir embora achando que funcionou, e a armadilha
  // continua valendo amanhã.
  if (String(formData.get(CAMPO_ARMADILHA) ?? "").trim() !== "") {
    return { ok: true, mensagem: AGRADECIMENTO };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const barNome = String(formData.get("bar_nome") ?? "").trim();
  const telefoneBruto = String(formData.get("telefone") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const mensagem = String(formData.get("mensagem") ?? "").trim();

  if (nome.length < 2) return { ok: false, mensagem: "Diga como podemos te chamar." };
  if (barNome.length < 2) return { ok: false, mensagem: "Informe o nome do bar." };

  const { email, problema } = analisarEmail(String(formData.get("email") ?? ""));
  if (problema === "formato") return { ok: false, mensagem: "Digite um e-mail válido." };
  if (problema === "descartavel") return { ok: false, mensagem: MENSAGEM_DESCARTAVEL };

  const telefone = normalizarTelefone(telefoneBruto);
  if (!telefone) {
    return {
      ok: false,
      mensagem: "Digite um telefone válido com DDD, como (11) 91234-5678.",
    };
  }

  if (mensagem.length > 2000) {
    return { ok: false, mensagem: "O recado ficou longo demais. Resuma em até 2000 caracteres." };
  }

  // 2. Turnstile.
  const ip = await ipDoVisitante();
  const passouNoCaptcha = await conferirTurnstile(
    String(formData.get("cf-turnstile-response") ?? ""),
    ip,
  );

  if (!passouNoCaptcha) {
    return {
      ok: false,
      mensagem: "A verificação de segurança falhou. Recarregue a página e tente de novo.",
    };
  }

  if (!serviceRoleConfigurado()) {
    return {
      ok: false,
      mensagem:
        "O formulário está fora do ar por um problema de configuração do servidor. Fale com a gente pelo LinkedIn, no rodapé desta página.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("registrar_interesse", {
    p_nome: nome,
    p_bar_nome: barNome,
    p_email: email,
    p_telefone: telefone,
    p_cidade: cidade || null,
    p_mensagem: mensagem || null,
    p_ip_hash: await hashDoIpAtual(),
  });

  if (error) {
    return { ok: false, mensagem: "Não consegui registrar seu pedido agora. Tente novamente." };
  }

  switch (data as string) {
    case "limite":
      return {
        ok: false,
        mensagem:
          "Esta conexão já enviou pedidos demais hoje. Se foi você, aguarde — já estamos com os seus dados.",
      };
    case "duplicado":
      return {
        ok: true,
        mensagem: "Já temos o seu pedido de hoje. Pode deixar que a gente entra em contato.",
      };
    case "faltando":
    case "tamanho":
      return { ok: false, mensagem: "Confira os campos e tente novamente." };
  }

  await avisarSobreInteresse({
    nome,
    barNome,
    email,
    telefone,
    cidade: cidade || null,
    mensagem: mensagem || null,
  });

  return { ok: true, mensagem: AGRADECIMENTO };
}
