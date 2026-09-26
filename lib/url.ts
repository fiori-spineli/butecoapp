import { headers } from "next/headers";

/** URL pública fixa do app, usada em convites e no QR do cliente. */
export async function origemDoApp(): Promise<string> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL;
  if (configurada) {
    const parsed = new URL(configurada);
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_SITE_URL deve usar HTTPS em produção.");
    }
    return parsed.origin;
  }
  if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_SITE_URL ausente.");

  const cabecalhos = await headers();
  const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host") ?? "localhost:3000";
  const protocolo =
    cabecalhos.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}
