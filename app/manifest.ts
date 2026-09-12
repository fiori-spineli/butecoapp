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
    // WebP primeiro, PNG logo atrás: o navegador escolhe o primeiro formato
    // que entende. O PNG fica como garantia — instalação de PWA é o único
    // lugar do app onde um formato não suportado não degrada, simplesmente
    // não instala. O arquivo antigo tinha 842 KB e nem era 512x512.
    icons: [
      { src: "/icone-512.webp", sizes: "512x512", type: "image/webp", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-512.webp", sizes: "512x512", type: "image/webp", purpose: "maskable" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}