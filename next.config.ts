import type { NextConfig } from "next";

/**
 * Cabeçalhos fixos de segurança, iguais em toda resposta.
 * A Content-Security-Policy não está aqui porque ela carrega um nonce por
 * requisição — ver proxy.ts e lib/csp.ts.
 */
const cabecalhosDeSeguranca = [
  // O navegador não "adivinha" tipo de arquivo: um upload servido como
  // texto nunca vira script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Link externo aberto a partir da comanda do cliente (/c/<token>) leva só a
  // origem no Referer, nunca o caminho com o token.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Reforço da frame-ancestors da CSP para navegador antigo.
  { key: "X-Frame-Options", value: "DENY" },
  // O app não usa nada disto; negar fecha a porta para script de terceiro.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Não anunciar o framework no cabeçalho de toda resposta.
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: cabecalhosDeSeguranca }];
  },
};

export default nextConfig;
