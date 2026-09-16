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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  serverExternalPackages: ["sharp"],

  experimental: {
    optimizePackageImports: ["browser-image-compression", "qrcode.react"],
    // Cache de navegação em memória. Estava em 300s (5 min) buscando "zero
    // requisições ao trocar de aba" — mas isso briga com o motivo de o app
    // existir: no salão, produto cadastrado no celular tem que aparecer no
    // caixa agora, não daqui a cinco minutos. Com 5s a troca de aba continua
    // instantânea (a ida seguinte vem do cache) sem servir conta velha.
    // Ver GUARDRAILS.md seção 9.
    // Navegacao entre abas vem do cache do roteador: instantanea, sem ida ao
    // servidor. Foi reduzido para 5s numa tentativa de manter o dado fresco, e
    // o efeito foi o oposto do desejado — cada troca de aba passou a esperar
    // 200 a 800ms pelo servidor, com a tela de carregamento aparecendo ao
    // voltar para Comandas.
    //
    // Quem mantem o dado fresco agora e o lib/sincronia-ao-vivo.ts:
    // ele pergunta uma assinatura barata do bar e so recarrega quando algo
    // mudou de verdade. Assim a troca de aba e imediata E o dado chega em
    // segundos — em vez de trocar uma coisa pela outra.
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