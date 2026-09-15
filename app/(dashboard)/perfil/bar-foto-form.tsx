"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoadingButeco } from "@/components/loading-buteco";

export function BarFotoForm({ fotoAtual }: { fotoAtual?: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subindo, setSubindo] = useState(false);
  const [previa, setPrevia] = useState<string | null>(fotoAtual ?? null);

  async function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubindo(true);
    const form = new FormData();
    form.append("arquivo", file);

    try {
      const res = await fetch("/api/bar/foto", { method: "POST", body: form });
      if (res.ok) {
        const { url } = await res.json();
        setPrevia(url);
        router.refresh();
      }
    } finally {
      setSubindo(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-20 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 overflow-hidden flex items-center justify-center shrink-0">
        {previa ? (
          <Image src={previa} alt="Foto do Bar" fill className="object-cover" />
        ) : (
          <span className="text-xs text-stone-400 font-bold">Sem foto</span>
        )}
      </div>

      <div className="flex-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={aoSelecionar}
          className="hidden"
        />
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
      </div>
    </div>
  );
}

export default BarFotoForm;