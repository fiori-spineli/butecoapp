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
    //
    // As quatro entradas são 2 formatos x 2 propósitos, e as quatro são usadas:
    // `any` é o ícone comum, `maskable` é o que o Android recorta na forma do
    // aparelho (sem ele, a logo ganha um quadrado branco atrás).
    //
    // MEDIDO EM PRODUÇÃO (2026-09-16), para ninguém investigar isto de novo: o
    // navegador RELÊ este manifesto a cada navegação do lado do cliente — 27
    // releituras numa sessão de 11 minutos, sempre no mesmo milissegundo da
    // troca de tela — e cada releitura procura os ícones declarados. É por isso
    // que `/icone-512.png` aparece dezenas de vezes no painel Network. O peso
    // disso é ZERO: `transferSize` 0 nas 27, porque o service worker entrega do
    // cache (public/sw.js) e nada sai para a rede. Reduzir as entradas exigiria
    // "any maskable" numa só, que a spec permite mas o tipo do Next recusa —
    // não vale um cast para economizar leitura de cache.
    icons: [
      { src: "/icone-512.webp", sizes: "512x512", type: "image/webp", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-512.webp", sizes: "512x512", type: "image/webp", purpose: "maskable" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}