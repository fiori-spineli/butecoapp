"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { atualizarProduto, removerProduto } from "@/app/actions/produtos";
import type { EstadoForm } from "@/app/actions/auth";
import type { Produto } from "@/lib/types";
import { LoadingButeco } from "@/components/loading-buteco";
import { EditorDeFoto } from "@/components/produto/editor-de-foto";

export function EditarProdutoForm({ produto }: { produto: Produto }) {
  const acaoComId = atualizarProduto.bind(null, produto.id);
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(acaoComId, null);

  const [previa, setPrevia] = useState<string | null>(produto.imagem_url);
  const [imagemUrl, setImagemUrl] = useState(produto.imagem_url ?? "");
  const [subindo, setSubindo] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [emEdicao, setEmEdicao] = useState<File | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const inputCamera = useRef<HTMLInputElement>(null);
  const inputGaleria = useRef<HTMLInputElement>(null);

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
      setPrevia(URL.createObjectURL(recortado));

      let paraEnviar: File | Blob = recortado;
      try {
        paraEnviar = await imageCompression(recortado, {
          maxSizeMB: 0.35,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: "image/webp",
          initialQuality: 0.8,
        });
      } catch {}

      const corpo = new FormData();
      corpo.append("arquivo", paraEnviar, "produto.webp");

      const resposta = await fetch("/api/produtos/imagem", { method: "POST", body: corpo });

      if (!resposta.ok) {
        const { erro } = (await resposta.json().catch(() => ({}))) as { erro?: string };
        throw new Error(erro || "Não consegui subir a foto. Tente de novo.");
      }

      const { url } = (await resposta.json()) as { url: string };
      setImagemUrl(url);
    } catch (e) {
      setErroFoto(e instanceof Error ? e.message : "Erro ao subir a foto.");
      setImagemUrl("");
    } finally {
      setSubindo(false);
    }
  }

  const precoFormatado = (produto.preco_centavos / 100).toFixed(2).replace(".", ",");

  return (
    <div className="flex flex-1 flex-col p-6 max-w-xl mx-auto w-full">
      <form action={acao} className="flex flex-col gap-6">
        <input type="hidden" name="imagem_url" value={imagemUrl} />

        <div>
          <label htmlFor="nome" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
            Nome do produto
          </label>
          <input
            id="nome"
            name="nome"
            defaultValue={produto.nome}
            required
            maxLength={120}
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 transition-all"
          />
        </div>

        <div>
          <label htmlFor="preco" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-300">
            Preço (R$)
          </label>
          <input
            id="preco"
            name="preco"
            defaultValue={precoFormatado}
            required
            inputMode="decimal"
            className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 px-4 py-3.5 text-stone-900 dark:text-stone-100 outline-none focus:border-amber-600 font-bold transition-all"
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
              <div className="relative mx-auto size-48 rounded-2xl border-2 border-dashed border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800/60 overflow-hidden flex items-center justify-center">
                {previa ? (
                  <Image src={previa} alt="Foto do produto" fill className="object-cover" />
                ) : (
                  <span className="text-xs text-stone-400">Sem foto</span>
                )}
              </div>

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
              />

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => inputCamera.current?.click()}
                  disabled={subindo}
                  className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  Tirar foto
                </button>
                <button
                  type="button"
                  onClick={() => inputGaleria.current?.click()}
                  disabled={subindo}
                  className="cursor-pointer flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 p-3 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
                >
                  Abrir galeria
                </button>
              </div>
            </>
          )}

          {subindo && <div className="mt-3"><LoadingButeco fraseFixa="Atualizando imagem..." /></div>}
          {erroFoto && <p className="mt-2 text-xs text-rose-600">{erroFoto}</p>}
        </div>

        {estado && !estado.ok && (
          <p className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-900 dark:text-rose-200">
            {estado.mensagem}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || subindo}
          className="cursor-pointer w-full rounded-xl bg-amber-700 hover:bg-amber-600 px-4 py-4 font-bold text-white shadow-xs transition-colors disabled:opacity-60"
        >
          {enviando ? <LoadingButeco /> : "Salvar alterações"}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
        {confirmandoExclusao ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 dark:bg-rose-950/20 p-4">
            <p className="text-xs text-rose-900 dark:text-rose-300 font-bold mb-3">
              Tem certeza que deseja apagar este produto?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="cursor-pointer flex-1 rounded-xl border border-stone-300 bg-white dark:bg-stone-800 py-2.5 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => removerProduto(produto.id)}
                className="cursor-pointer flex-1 rounded-xl bg-rose-700 hover:bg-rose-600 text-white py-2.5 text-xs font-bold"
              >
                Sim, apagar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="cursor-pointer w-full rounded-xl border border-rose-300 text-rose-700 dark:text-rose-400 py-3 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            Apagar produto do cardápio
          </button>
        )}
      </div>
    </div>
  );
}