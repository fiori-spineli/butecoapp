"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "./modal";

/**
 * Mostra o QR da comanda. É o mesmo token de sempre — reabrir esta tela
 * não gera link novo nem invalida o antigo.
 */
export function QRModal({
  link,
  titulo,
  aberto,
  aoFechar,
}: {
  link: string;
  titulo: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  async function compartilhar() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: titulo, text: "Sua conta no bar", url: link });
      } catch {
        // usuário cancelou — nada a fazer
      }
    } else {
      await copiar();
    }
  }

  return (
    <Modal titulo={titulo} aberto={aberto} aoFechar={aoFechar}>
      <p className="mb-4 text-center text-sm text-stone-500">
        Mostre o QR pro cliente escanear com o próprio celular.
      </p>

      <div className="mx-auto rounded-xl border border-stone-300 bg-white p-5">
        <QRCodeSVG value={link} size={188} level="M" marginSize={0} />
      </div>

      <p className="mt-4 truncate rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-center font-mono text-xs text-stone-500">
        {link.replace(/^https?:\/\//, "")}
      </p>

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={copiar}
          className="flex-1 rounded-lg border-2 border-stone-900 px-4 py-3 text-sm font-semibold"
        >
          {copiado ? "Link copiado!" : "Copiar link"}
        </button>
        <button
          type="button"
          onClick={compartilhar}
          className="flex-1 rounded-lg bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Compartilhar
        </button>
      </div>
    </Modal>
  );
}
