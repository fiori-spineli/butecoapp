"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "./modal";

export function QRModal({
  link,
  titulo,
  mensagem,
  aberto,
  aoFechar,
}: {
  link: string;
  titulo: string;
  /** Texto que vai junto do link no WhatsApp. Definido pelo dono em /perfil. */
  mensagem: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar(conteudo: string = link) {
    try {
      await navigator.clipboard.writeText(conteudo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  async function compartilhar() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: titulo, text: mensagem, url: link });
      } catch {
        // Cancelado pelo usuário
      }
      return;
    }

    // Computador do caixa não tem compartilhamento nativo. Copiar só o link
    // faria a mensagem que o dono escreveu se perder justamente aqui — então
    // vai o texto inteiro, pronto para colar no WhatsApp Web.
    await copiar(`${mensagem}\n\n${link}`);
  }

  return (
    <Modal titulo={`QR Code — ${titulo}`} aberto={aberto} aoFechar={aoFechar}>
      <p className="mb-4 text-center text-xs md:text-sm text-stone-600 dark:text-stone-400">
        Mostre o código abaixo para o cliente escanear com a câmera do celular. Ele acompanha o consumo em tempo real sem criar conta.
      </p>

      {/* Caixa do QR Code com fundo branco fixo para leitura perfeita da câmera */}
      <div className="mx-auto rounded-2xl border border-stone-300 dark:border-stone-700 bg-white p-5 shadow-xs flex items-center justify-center">
        <QRCodeSVG value={link} size={200} level="M" marginSize={0} />
      </div>

      <p className="mt-4 truncate rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-800/60 px-4 py-2.5 text-center font-mono text-xs text-stone-600 dark:text-stone-400 select-all">
        {link.replace(/^https?:\/\//, "")}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => copiar()}
          className="cursor-pointer rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 py-3 text-xs md:text-sm font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
        >
          {copiado ? "Link copiado!" : "Copiar link"}
        </button>
        <button
          type="button"
          onClick={compartilhar}
          className="cursor-pointer rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-700 dark:hover:bg-amber-600 px-4 py-3 text-xs md:text-sm font-bold text-white shadow-xs transition-colors flex items-center justify-center gap-2"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Compartilhar
        </button>
      </div>
    </Modal>
  );
}