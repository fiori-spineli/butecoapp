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
      {
        src: "/buteco_logo_clear.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/buteco_logo_clear.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}