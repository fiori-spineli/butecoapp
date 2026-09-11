"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { segundoFatorAindaVale } from "@/lib/mfa-frescor";

export interface StatusMFA {
  temFatorAtivo: boolean;
  precisaVerificar: boolean;
  fatorId?: string;
}

/** Verifica se o usuário atual já tem 2FA configurado e se a sessão já está em aal2 */
export async function verificarStatusMFA(): Promise<StatusMFA> {
  const supabase = await createSupabaseServerClient();
  const { data: fatores, error } = await supabase.auth.mfa.listFactors();

  if (error || !fatores) {
    return { temFatorAtivo: false, precisaVerificar: false };
  }

  const fatorTotpVerificado = fatores.totp.find((f) => f.status === "verified");

  if (!fatorTotpVerificado) {
    return { temFatorAtivo: false, precisaVerificar: false };
  }

  // Checa o nível da sessão atual — e há quanto tempo o código foi digitado.
  //
  // O nível aal2 não vence: uma vez elevado, a sessão segue elevada enquanto
  // existir (e ela não tem expiração absoluta). Para um painel que exclui
  // clientes, isso é frouxo demais. Ver lib/mfa-frescor.ts.
  const { data: nivelAal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: sessao } = await supabase.auth.getSession();

  const precisaVerificar =
    nivelAal?.currentLevel !== "aal2" || !segundoFatorAindaVale(sessao.session?.access_token);

  return {
    temFatorAtivo: true,
    precisaVerificar,
    fatorId: fatorTotpVerificado.id,
  };
}

/** Inicia o cadastro de um novo aplicativo autenticador e gera o QR Code */
export async function iniciarCadastroTOTP() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "ButecoApp Admin",
  });

  if (error || !data) {
    return { ok: false, mensagem: error?.message || "Não foi possível gerar a chave de segurança." };
  }

  return {
    ok: true,
    fatorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Confirma o primeiro pareamento do QR Code com o código digitado */
export async function confirmarCadastroTOTP(fatorId: string, codigo: string) {
  const supabase = await createSupabaseServerClient();
  const codigoLimpo = codigo.replace(/\s+/g, "").trim();

  // 1. Cria o desafio
  const { data: desafio, error: erroDesafio } = await supabase.auth.mfa.challenge({
    factorId: fatorId,
  });

  if (erroDesafio || !desafio) {
    return { ok: false, mensagem: "Erro ao iniciar verificação." };
  }

  // 2. Valida o código
  const { error: erroVerificacao } = await supabase.auth.mfa.verify({
    factorId: fatorId,
    challengeId: desafio.id,
    code: codigoLimpo,
  });

  if (erroVerificacao) {
    return { ok: false, mensagem: "Código incorreto ou expirado. Tente novamente." };
  }

  return { ok: true };
}

/** Valida o login 2FA de rotina para elevar a sessão para aal2 */
export async function validarCodigoMFA(fatorId: string, codigo: string) {
  const supabase = await createSupabaseServerClient();
  const codigoLimpo = codigo.replace(/\s+/g, "").trim();

  const { data: desafio, error: erroDesafio } = await supabase.auth.mfa.challenge({
    factorId: fatorId,
  });

  if (erroDesafio || !desafio) {
    return { ok: false, mensagem: "Não foi possível validar o segundo fator." };
  }

  const { error: erroVerificacao } = await supabase.auth.mfa.verify({
    factorId: fatorId,
    challengeId: desafio.id,
    code: codigoLimpo,
  });

  if (erroVerificacao) {
    return { ok: false, mensagem: "Código inválido. Verifique o relógio do seu celular." };
  }

  return { ok: true };
}