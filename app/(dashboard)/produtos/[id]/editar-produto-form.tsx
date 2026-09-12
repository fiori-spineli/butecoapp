"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { atualizarProduto, removerProduto } from "@/app/actions/produtos";
import { LoadingButeco } from "@/components/loading-buteco";
import { EditorDeFoto } from "@/components/produto/editor-de-foto";
import type { Produto } from "@/lib/types";

export function EditarProdutoForm({ produto }: { produto: Produto }) {
  const acaoVinculada = atualizarProduto.bind(null, produto.id);
  const [estado, acao, enviando] = useActionState(acaoVinculada, null);
  const [previa, setPrevia] = useState<string | null>(produto.imagem_url);
  const [imagemUrl, setImagemUrl] = useState(produto.imagem_url ?? "");
  const [subindo, setSubindo] = useState(false);
  const [excluindo, iniciarExclusao] = useTransition();
  const [emEdicao, setEmEdicao] = useState<File | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);

  const inputCamera = useRef<HTMLInputElement>(null);
  const inputGaleria = useRef<HTMLInputElement>(null);

  /** Escolher a foto abre o editor; o recorte é do dono, não automático. */
  function escolherArquivo(arquivo?: File) {
    if (!arquivo) return;
    setErroFoto(null);
    setEmEdicao(arquivo);
  }

  async function enviarRecorte(recorte: Blob) {
    setEmEdicao(null);
    setErroFoto(null);
    setSubindo(true);

    try {
      const recortado = new File([recorte], "produto.jpg", { type: "image/jpeg" });

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
        // Navegador antigo sem WebP no canvas: o servidor converte.
      }

      const corpo = new FormData();
      corpo.append("arquivo", paraEnviar, "produto.webp");

      const res = await fetch("/api/produtos/imagem", { method: "POST", body: corpo });

      if (!res.ok) {
        const { erro } = (await res.json().catch(() => ({}))) as { erro?: string };
        throw new Error(erro || "");
      }

      const { url } = (await res.json()) as { url: string };
      setImagemUrl(url);
      setPrevia(url);
    } catch (e) {
      // Antes isso era engolido em silêncio: a foto não subia e o dono ficava
      // olhando para a foto antiga sem entender o que houve. Agora o motivo
      // vem do servidor quando ele soube dizer qual foi.
      setErroFoto(
        e instanceof Error && e.message
          ? `${e.message} A foto anterior foi mantida.`
          : "Não consegui subir a foto. A anterior foi mantida.",
      );
    } finally {
      setSubindo(false);
    }
  }

  return (
    <form action={acao} className="flex flex-1 flex-col gap-6 p-6 max-w-xl mx-auto w-full">
      <input type="hidden" name="imagem_url" value={imagemUrl} />

      <div>
        <label htmlFor="nome" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Nome do produto <span aria-hidden className="text-rose-600 dark:text-rose-400">*</span>
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={produto.nome}
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600"
        />
      </div>

      <div>
        <label htmlFor="preco" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Preço (R$) <span aria-hidden className="text-rose-600 dark:text-rose-400">*</span>
        </label>
        <input
          id="preco"
          name="preco"
          required
          inputMode="decimal"
          defaultValue={(produto.preco_centavos / 100).toFixed(2).replace(".", ",")}
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 font-bold"
        />
      </div>

      <div>
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
          Foto do item
        </span>

        {emEdicao ? (
          <EditorDeFoto
            arquivo={emEdicao}
            aoConfirmar={enviarRecorte}
            aoCancelar={() => setEmEdicao(null)}
          />
        ) : (
          <>
          <div className="relative mx-auto size-44 rounded-2xl border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 overflow-hidden flex items-center justify-center">
            {previa ? (
              <Image src={previa} alt={produto.nome} fill className="object-cover" />
            ) : (
              <span className="text-xs text-stone-400">Sem foto</span>
            )}
          </div>

          <input ref={inputCamera} type="file" accept="image/*" capture="environment" onChange={(e) => { escolherArquivo(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />
          <input ref={inputGaleria} type="file" accept="image/*" onChange={(e) => { escolherArquivo(e.target.files?.[0]); e.target.value = ""; }} className="hidden" />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => inputCamera.current?.click()}
              disabled={subindo}
              className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50"
            >
              Tirar foto
            </button>
            <button
              type="button"
              onClick={() => inputGaleria.current?.click()}
              disabled={subindo}
              className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50"
            >
              Galeria
            </button>
          </div>
          </>
        )}

        {subindo && <div className="mt-3"><LoadingButeco fraseFixa="Preparando a foto..." /></div>}

        {erroFoto && (
          <p role="alert" className="mt-2 text-xs text-rose-600 dark:text-rose-400">
            {erroFoto}
          </p>
        )}
      </div>

      {estado && !estado.ok && (
        <p className="text-xs text-rose-600">{estado.mensagem}</p>
      )}

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <button
          type="submit"
          disabled={enviando || subindo}
          className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 py-4 font-bold text-white shadow-xs"
        >
          {enviando ? <LoadingButeco /> : "Salvar alterações"}
        </button>

        <button
          type="button"
          disabled={excluindo}
          onClick={() => {
            if (confirm(`Tem certeza que deseja apagar o produto "${produto.nome}"?`)) {
              iniciarExclusao(async () => await removerProduto(produto.id));
            }
          }}
          className="cursor-pointer w-full rounded-xl border border-rose-200 dark:border-rose-950 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          {excluindo ? "Apagando..." : "Excluir este produto"}
        </button>
      </div>
    </form>
  );
}