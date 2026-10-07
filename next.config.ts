import type { NextConfig } from "next";

const cabecalhosDeSeguranca = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

/** Host público do bucket R2 configurado neste ambiente. */
const hostDoR2 = (() => {
  try {
    const domain = process.env.R2_PUBLIC_DOMAIN ?? "";
    return new URL(domain.startsWith("http") ? domain : `https://${domain}`).hostname || null;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    // Somente o domínio R2 configurado pode fornecer imagens remotas.
    remotePatterns: [
      {
        protocol: "https",
        hostname: hostDoR2 ?? "r2-nao-configurado.invalid",
        pathname: "/**",
      },
    ],
  },

  serverExternalPackages: ["sharp"],

  experimental: {
    optimizePackageImports: ["browser-image-compression", "qrcode.react"],
    // Cache de navegação do roteador (GUARDRAILS §9). Valor vigente: 180 s para
    // páginas dinâmicas — trocar de aba é instantâneo, sem ida ao servidor.
    //
    // Histórico: houve uma tentativa com 5 s para manter o dado fresco, e o
    // efeito foi o oposto — cada troca de aba esperava 200 a 800 ms e a tela de
    // carregamento aparecia ao voltar para Comandas.
    //
    // Quem mantém o dado fresco é lib/sincronia-ao-vivo.ts: pergunta uma
    // assinatura barata do bar e só recarrega quando algo mudou de verdade.
    // Assim a troca de aba é imediata E o dado chega em segundos.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: cabecalhosDeSeguranca,
      },
      {
        // Imutável só para o que tem nome que muda quando o conteúdo muda
        // (foto de produto sobe com UUID novo, fonte é versionada). O
        // `webmanifest` saiu desta lista: ele tem nome fixo e ganhou regra
        // própria abaixo, senão ficava preso por um ano.
        source: "/:path*{.(ico|png|jpg|jpeg|webp|svg|woff|woff2)}",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Mesmo motivo do manifesto: o nome é fixo, então "immutable" impede
        // trocar o ícone do app por um ano. Um dia de cache com revalidação.
        source: "/icone-512.{png,webp}",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        // O manifesto NÃO é imutável (nome de arquivo fixo trancaria nome do
        // app e ícones por um ano), mas também NÃO leva `must-revalidate`:
        // com ele o navegador perguntava ao servidor a cada navegação, e o
        // manifesto puxava o ícone junto — medido em produção, 7 idas de cada
        // um em poucas trocas de aba. Uma hora de cache simples resolve os
        // dois lados.
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;
