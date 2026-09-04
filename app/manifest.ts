import type { MetadataRoute } from "next";

/** Deixa o app "instalável" na tela inicial do celular do dono (PWA). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BotecoApp",
    short_name: "BotecoApp",
    description: "O caderninho de contas do boteco, no celular.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#2b2a28",
  };
}
