import type { Metadata, Viewport } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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