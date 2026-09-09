import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsButeco } from "@/components/analytics-buteco";
import "./globals.css";

export const metadata: Metadata = {
  title: "ButecoApp",
  description: "O caderninho de contas do buteco, no celular.",
  appleWebApp: { capable: true, title: "ButecoApp", statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2b2a28",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-stone-100 text-stone-900 antialiased">
        {children}

        {/*
          Mede o carregamento real nos celulares de quem usa, para sabermos se
          a lentidão vem de rede, de cold start ou de render — em vez de
          adivinhar. É a versão `/next` de propósito: ela informa o PADRÃO da
          rota (`/c/[token]`) em vez do caminho resolvido. Isso importa aqui,
          porque o token da comanda É a credencial de acesso do cliente e não
          pode acabar num painel de métricas.
        */}
        <SpeedInsights />

        {/* Ver components/analytics-buteco.tsx: o token da comanda é removido
            da URL antes de qualquer evento sair do navegador. */}
        <AnalyticsButeco />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}