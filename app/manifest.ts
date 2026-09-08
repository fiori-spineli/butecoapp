import type { MetadataRoute } from "next";

/** Deixa o app "instalável" na tela inicial do celular do dono (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ButecoApp",
    short_name: "ButecoApp",
    description: "O caderninho de contas do buteco, no celular.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#2b2a28",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // O Android recorta o ícone instalado num círculo. A logo tem o texto
      // "buteco" quase encostando na borda, então a versão maskable entra
      // reduzida sobre o próprio fundo — sem isso o "b" e o "o" somem no corte.
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
