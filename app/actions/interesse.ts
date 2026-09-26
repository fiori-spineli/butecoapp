"use server";

import { MENSAGEM_DESCARTAVEL, analisarEmail } from "@/lib/email-descartavel";
import { hashDoIpAtual, ipDoVisitante } from "@/lib/ip";
import { normalizarTelefone } from "@/lib/telefone";
import { conferirTurnstile } from "@/lib/turnstile";
import { avisarSobreInteresse } from "@/lib/aviso-interesse";
import { CAMPO_ARMADILHA } from "@/lib/armadilha";
import { registrarInteresseNoNeon } from "@/lib/neon/interessados";

export type EstadoInteresse = { ok: boolean; mensagem: string } | null;

const AGRADECIMENTO =
  "Recebido! Vamos falar com você pelo telefone ou pelo e-mail informado o quanto antes.";

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
 * A inserção usa a conexão Neon apenas no servidor. O cliente não recebe
 * credenciais do banco e o limite é conferido dentro de uma transação.
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

  if (nome.length < 2 || nome.length > 120) return { ok: false, mensagem: "Informe seu nome em até 120 caracteres." };
  if (barNome.length < 2 || barNome.length > 120) return { ok: false, mensagem: "Informe o nome do bar em até 120 caracteres." };
  if (cidade.length > 120) return { ok: false, mensagem: "O nome da cidade ficou longo demais." };

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

  let resultado: "ok" | "limite" | "duplicado";
  try {
    resultado = await registrarInteresseNoNeon({
      nome, barNome, email, telefone, cidade: cidade || null,
      mensagem: mensagem || null, ipHash: await hashDoIpAtual(),
    });
  } catch (error) {
    console.error("Falha ao registrar interesse no Neon", error);
    return { ok: false, mensagem: "Não consegui registrar seu pedido agora. Tente novamente." };
  }

  switch (resultado) {
    case "limite":
      return {
        ok: false,
        mensagem:
          "Esta conexão já enviou pedidos demais hoje. Se foi você, aguarde — já estamos com os seus dados.",
      };
    case "duplicado":
      return {
        ok: true,
        mensagem: "Já temos o seu pedido de hoje. Pode deixar que a gente entra em contato em breve.",
      };
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
