"use client";

import { useActionState, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { criarProduto } from "@/app/actions/produtos";
import type { EstadoForm } from "@/app/actions/auth";

/**
 * A foto é convertida para WebP aqui no navegador antes de subir (economiza
 * dados numa rede de buteco); a rota /api/produtos/imagem reprocessa com sharp
 * como rede de segurança. O input NÃO usa o atributo `capture` — assim o
 * celular oferece câmera E galeria, em vez de forçar a câmera.
 */
export function NovoProdutoForm() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(criarProduto, null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [imagemUrl, setImagemUrl] = useState("");
  const [subindo, setSubindo] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  async function aoEscolherFoto(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    setErroFoto(null);
    setSubindo(true);
    setPrevia(URL.createObjectURL(arquivo));

    try {
      let paraEnviar: File | Blob = arquivo;
      try {
        paraEnviar = await imageCompression(arquivo, {
          maxSizeMB: 0.35,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: 0.8,
        });
      } catch {
        // Navegador sem suporte a WebP no canvas: sobe o original e deixa o
        // servidor converter.
      }

      const corpo = new FormData();
      corpo.append("arquivo", paraEnviar, "produto.webp");

      const resposta = await fetch("/api/produtos/imagem", { method: "POST", body: corpo });
      if (!resposta.ok) throw new Error("upload falhou");

      const { url } = (await resposta.json()) as { url: string };
      setImagemUrl(url);
    } catch {
      setErroFoto("Não consegui subir a foto. Dá pra salvar o produto sem ela.");
      setImagemUrl("");
    } finally {
      setSubindo(false);
    }
  }

  return (
    <form action={acao} className="flex flex-1 flex-col gap-5 px-5 py-6">
      <input type="hidden" name="imagem_url" value={imagemUrl} />

      <div>
        <label htmlFor="nome" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
          Nome do produto
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoFocus
          placeholder="Long Neck"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3.5 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
        />
      </div>

      <div>
        <label htmlFor="preco" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
          Preço
        </label>
        <input
          id="preco"
          name="preco"
          required
          inputMode="decimal"
          placeholder="8,00"
          className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3.5 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
        />
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
          Foto <span className="font-normal normal-case text-stone-400">(opcional)</span>
        </p>

        <div className="flex aspect-[1.6] items-center justify-center overflow-hidden rounded-xl border border-dashed border-stone-400 bg-white">
          {previa ? (
            // Prévia local (blob:) — não passa pelo otimizador de imagem.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previa} alt="Prévia da foto do produto" className="size-full object-cover" />
          ) : (
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#b5b2ac" strokeWidth="1.6" aria-hidden>
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7l1.5-2.5h5L16 7" />
              <circle cx="12" cy="13.5" r="3.5" />
            </svg>
          )}
        </div>

        <input
          ref={inputArquivo}
          type="file"
          accept="image/*"
          onChange={aoEscolherFoto}
          className="hidden"
          aria-label="Escolher foto do produto"
        />

        <button
          type="button"
          onClick={() => inputArquivo.current?.click()}
          disabled={subindo}
          className="mt-2.5 w-full rounded-lg border-2 border-stone-900 px-4 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {subindo ? "Enviando foto…" : previa ? "Trocar foto" : "Tirar foto ou escolher da galeria"}
        </button>

        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          O celular oferece as duas opções — câmera ou galeria. A imagem é convertida para
          WebP antes de subir.
        </p>

        {erroFoto ? (
          <p role="alert" className="mt-2 text-xs text-amber-700">
            {erroFoto}
          </p>
        ) : null}
      </div>

      {estado && !estado.ok ? (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {estado.mensagem}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando || subindo}
        className="mt-auto rounded-lg bg-stone-900 px-4 py-4 font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
      >
        {enviando ? "Salvando…" : "Salvar produto"}
      </button>
    </form>
  );
}
