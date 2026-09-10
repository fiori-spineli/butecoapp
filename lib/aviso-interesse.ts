/**
 * Avisa a gente quando alguém pede o ButecoApp.
 *
 * Sem isso o pedido fica esperando no painel até alguém lembrar de olhar — e
 * um bar que pediu na terça e teve resposta no sábado já procurou outra coisa.
 *
 * Chamada por HTTP direto na API do Resend em vez do SDK: é uma requisição só,
 * e o SDK seria uma dependência a mais no bundle do servidor para isso.
 *
 * Tudo aqui é opcional e nunca derruba o cadastro do interessado: se o e-mail
 * falhar, o pedido já está gravado no banco, que é o que importa.
 */

type DadosDoAviso = {
  nome: string;
  barNome: string;
  email: string;
  telefone: string;
  cidade: string | null;
  mensagem: string | null;
};

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function avisarSobreInteresse(dados: DadosDoAviso): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  const destinos = (process.env.EMAIL_AVISO_INTERESSE ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!chave || destinos.length === 0) return;

  // Sem domínio verificado no Resend, o onboarding@resend.dev só entrega para
  // o dono da conta. Ver a nota no README sobre o que muda com domínio próprio.
  const remetente = process.env.EMAIL_REMETENTE ?? "ButecoApp <onboarding@resend.dev>";

  const linhas = [
    ["Bar", dados.barNome],
    ["Pessoa", dados.nome],
    ["Telefone", dados.telefone],
    ["E-mail", dados.email],
    ["Cidade", dados.cidade ?? "—"],
    ["Recado", dados.mensagem ?? "—"],
  ];

  const html = `
    <h2 style="font-family:system-ui,sans-serif">Novo bar interessado</h2>
    <table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">
      ${linhas
        .map(
          ([rotulo, valor]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#78716c">${rotulo}</td><td style="padding:4px 0"><strong>${escaparHtml(valor)}</strong></td></tr>`,
        )
        .join("")}
    </table>
    <p style="font-family:system-ui,sans-serif;font-size:13px;color:#78716c">
      Abra o painel de admin para criar a conta deste bar.
    </p>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${chave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: remetente,
        to: destinos,
        subject: `ButecoApp: ${dados.barNome} quer usar o sistema`,
        html,
        reply_to: dados.email,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // Silêncio de propósito: o pedido já está no banco e aparece no painel.
  }
}
