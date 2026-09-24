"use client";

import { RecuperarSenha } from "@/components/recuperar-senha";

/**
 * Troca de senha pelo Perfil.
 *
 * É o mesmo código por e-mail do "Esqueceu a senha?": trocar senha exige a
 * caixa postal, para que o celular logado esquecido no balcão não sirva para
 * isso. O botão antigo chamava o envio sem o token do CAPTCHA, e o Auth — com
 * o Turnstile ligado — recusava todas as vezes: nunca saiu e-mail daqui.
 */
export function SenhaForm({ email }: { email: string }) {
  return <RecuperarSenha modo="perfil" emailInicial={email} />;
}
