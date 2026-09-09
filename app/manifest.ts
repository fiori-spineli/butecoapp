import type { MetadataRoute } from "next";

/** Deixa o app "instalável" na tela inicial do celular do dono (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ButecoApp",
    short_name: "ButecoApp",
    description: "O caderninho de contas do buteco, no celular.",
    // A raiz decide para onde ir: /admin, /onboarding ou /dashboard, conforme
    // quem abriu. Apontar direto para /dashboard fazia o app instalado entrar
    // numa fila de redirecionamentos quando o dono ainda não tinha bar — ou
    // quando quem abria era admin.
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#2b2a28",
    icons: [
      {
        src: "/buteco_logo_pwa.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/buteco_logo_pwa.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}