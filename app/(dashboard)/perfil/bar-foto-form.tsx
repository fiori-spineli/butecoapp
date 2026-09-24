"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoadingButeco } from "@/components/loading-buteco";

/**
 * Reduz a foto no próprio aparelho antes de subir.
 *
 * Foto de celular sai com 5 a 12 MB, e a Vercel recusa corpo de requisição
 * acima de ~4,5 MB antes de a rota sequer rodar — a troca de logo falhava sem
 * aviso nenhum. A logo final tem 400×400; 1024 de lado sobra para o recorte.
 * Se o navegador não souber abrir o arquivo aqui, manda o original e o
 * servidor responde o que houve.
 */
async function reduzirParaEnvio(arquivo: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.9));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}

export function BarFotoForm({ fotoAtual }: { fotoAtual?: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subindo, setSubindo] = useState(false);
  const [previa, setPrevia] = useState<string | null>(fotoAtual ?? null);
  const [erro, setErro] = useState<string | null>(null);

  async function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Limpa a escolha: escolher a MESMA foto de novo depois de um erro tem de
    // disparar o onChange outra vez.
    e.target.value = "";
    if (!file) return;

    setSubindo(true);
    setErro(null);

    try {
      const form = new FormData();
      form.append("arquivo", await reduzirParaEnvio(file), "logo.webp");
      const res = await fetch("/api/bar/foto", { method: "POST", body: form });
      const corpo = (await res.json().catch(() => null)) as { url?: string; erro?: string } | null;
      if (res.ok && corpo?.url) {
        setPrevia(corpo.url);
        router.refresh();
      } else {
        setErro(corpo?.erro ?? "Não consegui trocar a foto. Tente de novo.");
      }
    } catch {
      setErro("Sem conexão com o servidor. Confira a internet e tente de novo.");
    } finally {
      setSubindo(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      {/* Box de Prévia: Mostra a foto ou a caneca dourada padrão */}
      <div className="relative size-20 rounded-2xl border border-amber-600/40 overflow-hidden flex items-center justify-center shrink-0 shadow-xs bg-linear-to-br from-amber-600 to-amber-800">
        {previa ? (
          <Image src={previa} alt="Foto do Bar" fill className="object-cover" />
        ) : (
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/90"
            aria-hidden
          >
            <path d="M17 11h1a3 3 0 0 1 0 6h-1" />
            <path d="M9 2v3M13 2v3" />
            <path d="M5 5h12v12a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" />
          </svg>
        )}
      </div>

      <div className="flex-1">
        <input ref={inputRef} type="file" accept="image/*" onChange={aoSelecionar} aria-label="Escolher a foto do bar" className="hidden" />
        <button
          type="button"
          disabled={subindo}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer min-h-11 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-2.5 text-xs font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {subindo ? <LoadingButeco fraseFixa="Otimizando WebP..." /> : "Escolher foto do bar"}
        </button>
        <p className="mt-1.5 text-[11px] text-stone-400">
          Recomendado imagem quadrada. O sistema redimensiona e converte para WebP automaticamente.
        </p>
        {erro && (
          <p role="alert" className="mt-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
            {erro}
          </p>
        )}
      </div>
    </div>
  );
}

export default BarFotoForm;