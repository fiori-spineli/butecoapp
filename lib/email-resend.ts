import "server-only";

/** Transactional mail goes only through the configured Resend account. */
export async function enviarEmail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Resend não configurado.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("[resend] falha de envio", response.status);
    throw new Error("Falha no envio de e-mail.");
  }
}
