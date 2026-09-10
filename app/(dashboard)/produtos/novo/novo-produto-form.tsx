"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { criarProduto } from "@/app/actions/produtos";
import type { EstadoForm } from "@/app/actions/auth";
import { LoadingButeco } from "@/components/loading-buteco";
import { EditorDeFoto } from "@/components/produto/editor-de-foto";

export function NovoProdutoForm() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(criarProduto, null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [imagemUrl, setImagemUrl] = useState("");
  const [subindo, setSubindo] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [emEdicao, setEmEdicao] = useState<File | null>(null);

  // Inputs separados para Câmera e Galeria
  const inputCamera = useRef<HTMLInputElement>(null);
  const inputGaleria = useRef<HTMLInputElement>(null);

  /**
   * Escolher a foto agora só ABRE o editor. O recorte deixou de ser
   * automático e central: quem enquadra é o dono, que sabe onde está a
   * garrafa na foto.
   */
  function escolherArquivo(arquivo?: File) {
    if (!arquivo) return;
    setErroFoto(null);
    setEmEdicao(arquivo);
  }

  /** Recebe o recorte do editor, converte para WebP e sobe. */
  async function enviarRecorte(recorte: Blob) {
    setEmEdicao(null);
    setErroFoto(null);
    setSubindo(true);

    try {
      const recortado = new File([recorte], "produto.jpg", { type: "image/jpeg" });
      setPrevia(URL.createObjectURL(recortado));

      // A conversão para WebP continua igual: economiza dados numa rede de
      // bar, e a rota do servidor reprocessa com sharp como rede de segurança.
      let paraEnviar: File | Blob = recortado;
      try {
        paraEnviar = await imageCompression(recortado, {
          maxSizeMB: 0.35,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: 0.8,
        });
      } catch {
        // Navegador antigo sem WebP no canvas: sobe o JPEG e o servidor converte.
      }

      const corpo = new FormData();
      corpo.append("arquivo", paraEnviar, "produto.webp");

      const resposta = await fetch("/api/produtos/imagem", { method: "POST", body: corpo });
      if (!resposta.ok) throw new Error("Upload falhou");

      const { url } = (await resposta.json()) as { url: string };
      setImagemUrl(url);
    } catch {
      setErroFoto("Não consegui subir a foto. Você pode salvar o produto sem ela.");
      setImagemUrl("");
    } finally {
      setSubindo(false);
    }
  }

  return (
    <form action={acao} className="flex flex-1 flex-col gap-6 p-6 max-w-xl mx-auto w-full">
      <input type="hidden" name="imagem_url" value={imagemUrl} />

      {/* Nome do Produto */}
      <div>
        <label
          htmlFor="nome"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
        >
          Nome do produto <span aria-hidden className="text-rose-600 dark:text-rose-400">*</span>
        </label>
        <input
          id="nome"
          name="nome"
          required
          autoFocus
          placeholder="Ex: Cerveja 600ml, Batata Frita"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
        />
      </div>

      {/* Preço */}
      <div>
        <label
          htmlFor="preco"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300"
        >
          Preço (R$) <span aria-hidden className="text-rose-600 dark:text-rose-400">*</span>
        </label>
        <input
          id="preco"
          name="preco"
          required
          inputMode="decimal"
          placeholder="Ex: 14,00"
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all font-bold"
        />
      </div>

      {/* Foto do Produto */}
      <div>
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Foto do item <span className="font-normal normal-case text-stone-400">(opcional)</span>
        </span>

        {emEdicao ? (
          <EditorDeFoto
            arquivo={emEdicao}
            aoConfirmar={enviarRecorte}
            aoCancelar={() => setEmEdicao(null)}
          />
        ) : (
          <>
          {/* Prévia Quadrada (Recortada) */}
          <div className="relative mx-auto size-48 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/60 overflow-hidden flex items-center justify-center">
            {previa ? (
              <Image
                src={previa}
                alt="Prévia do produto"
                fill
                className="object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mx-auto text-stone-400 mb-1" aria-hidden>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-xs text-stone-400">Enquadre você mesmo ao escolher</span>
              </div>
            )}
          </div>

          {/* Inputs Ocultos */}
          <input
            ref={inputCamera}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
                escolherArquivo(e.target.files?.[0]);
                e.target.value = "";
              }}
            className="hidden"
            aria-label="Tirar foto com a câmera"
          />
          <input
            ref={inputGaleria}
            type="file"
            accept="image/*"
            onChange={(e) => {
                escolherArquivo(e.target.files?.[0]);
                e.target.value = "";
              }}
            className="hidden"
            aria-label="Escolher foto da galeria"
          />

          {/* Dois Botões Separados */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => inputCamera.current?.click()}
              disabled={subindo}
              className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-xs md:text-sm font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50 shadow-xs"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Tirar foto
            </button>

            <button
              type="button"
              onClick={() => inputGaleria.current?.click()}
              disabled={subindo}
              className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-xs md:text-sm font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50 shadow-xs"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Abrir galeria
            </button>
          </div>
          </>
        )}

        {subindo && (
          <div className="mt-3">
            <LoadingButeco fraseFixa="Preparando a foto..." />
          </div>
        )}

        {erroFoto && (
          <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            {erroFoto}
          </p>
        )}
      </div>

      {estado && !estado.ok && (
        <p role="alert" className="rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-900 dark:text-rose-200">
          {estado.mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || subindo}
        className="cursor-pointer mt-4 w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-4 py-4 font-bold text-white shadow-xs transition-colors disabled:opacity-60"
      >
        {enviando ? <LoadingButeco /> : "Salvar produto"}
      </button>
    </form>
  );
}