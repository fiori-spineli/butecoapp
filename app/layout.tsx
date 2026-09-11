import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { SpeedInsightsButeco } from "@/components/speed-insights-buteco";
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Nonce da CSP desta requisição (ver proxy.ts e lib/csp.ts). O Next.js
  // carimba os scripts dele sozinho; o registro do service worker logo abaixo
  // é o único script inline nosso, e sem o nonce a política o bloquearia.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100 antialiased">
        {children}

        {/* Ver components/speed-insights-buteco.tsx: mede tudo menos a
            página do cliente, cujo beacon carregaria o token da comanda. */}
        <SpeedInsightsButeco />

        {/* Ver components/analytics-buteco.tsx: o token da comanda é removido
            da URL antes de qualquer evento sair do navegador. */}
        <AnalyticsButeco />

        <script
          nonce={nonce}
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