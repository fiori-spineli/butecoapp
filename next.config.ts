import type { NextConfig } from "next";

/**
 * Cabeçalhos fixos de segurança, iguais em toda resposta.
 * A Content-Security-Policy é montada dinamicamente com nonce no proxy.ts / lib/csp.ts.
 */
const cabecalhosDeSeguranca = [
  // Impede o navegador de adivinhar o MIME-type (evita execução de scripts disfarçados)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Protege a URL com o token da comanda do cliente ao clicar em links externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Proteção contra Clickjacking em navegadores antigos
  { key: "X-Frame-Options", value: "DENY" },
  // Restringe APIs de hardware desnecessárias para scripts de terceiros
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // 1. Oculta o cabeçalho X-Powered-By: Next.js (segurança e economia de bytes)
  poweredByHeader: false,

  // 2. Garante compressão Gzip e Brotli ativa em todas as respostas
  compress: true,

  // 3. Otimizações de Compilação em Produção
  compiler: {
    // Remove console.log e console.info em produção para deixar o bundle JS mais leve
    // Preserva console.error e console.warn para monitoramento de falhas reais
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // 4. Otimizações de Carregamento de Imagens
  images: {
    // Negocia AVIF primeiro (mais leve e rápido que WebP), com fallback para WebP
    formats: ["image/avif", "image/webp"],
    // Mantém imagens otimizadas do Supabase em cache na CDN por até 24 horas
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // 5. Trata o 'sharp' como pacote externo de servidor (essencial para processar fotos no Node.js da Vercel)
  serverExternalPackages: ["sharp"],

  // 6. Tree-shaking cirúrgico de pacotes pesados no frontend
  experimental: {
    optimizePackageImports: ["browser-image-compression", "qrcode.react"],
  },

  // 7. Cabeçalhos HTTP customizados
  async headers() {
    return [
      {
        // Aplica cabeçalhos de segurança em todas as páginas e rotas
        source: "/(.*)",
        headers: cabecalhosDeSeguranca,
      },
      {
        // Garante que o Service Worker da PWA nunca fique preso no cache do navegador
        // Quando você subir uma versão nova, os celulares dos bares atualizam na hora
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default nextConfig;