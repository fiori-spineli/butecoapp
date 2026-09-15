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
    // Trava as páginas navegadas na memória RAM do navegador por 5 minutos
    // Alternar entre abas fica 100% instantâneo (ZERO requisições _rsc)
    staleTimes: {
      dynamic: 300, // 5 minutos de cache em memória para páginas dinâmicas
      static: 600,  // 10 minutos para páginas estáticas
    },
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: cabecalhosDeSeguranca,
      },
      {
        // Cache imutável para TODAS as imagens, ícones e manifesto:
        // Baixa 1 única vez na vida e nunca mais faz requisição de rede
        source: "/:path*{.(ico|png|jpg|jpeg|webp|svg|woff|woff2|webmanifest)}",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/icone-512.png",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;