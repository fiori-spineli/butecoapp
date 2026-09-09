"use client";

import { useState } from "react";
import { AdicionarItens } from "./adicionar-itens";
import { DividirConta, type ItemDivisivel } from "./dividir-conta";
import { QRModal } from "./qr-modal";
import type { Produto } from "@/lib/types";

export function AcoesComanda({
  clienteId,
  nomeComanda,
  link,
  mensagemQr,
  produtos,
  itens,
  totalCentavos,
  restanteCentavos,
  contaAberta,
  abrirQrDeCara,
}: {
  clienteId: string;
  nomeComanda: string;
  link: string;
  mensagemQr: string;
  produtos: Produto[];
  itens: ItemDivisivel[];
  totalCentavos: number;
  restanteCentavos: number;
  contaAberta: boolean;
  abrirQrDeCara: boolean;
}) {
  const [modal, setModal] = useState<null | "itens" | "dividir" | "qr">(
    abrirQrDeCara ? "qr" : null,
  );

  return (
    <>
      <div className="sticky bottom-0 z-20 flex flex-col gap-2.5 border-t border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 px-6 pt-4 pb-6 backdrop-blur-sm">
        {contaAberta ? (
          <button
            type="button"
            onClick={() => setModal("itens")}
            className="cursor-pointer flex items-center justify-center gap-2 rounded-xl bg-amber-700 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 px-5 py-3.5 font-bold text-white shadow-xs transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Adicionar item à conta
          </button>
        ) : null}

        <div className="flex gap-3">
          <BotaoSecundario onClick={() => setModal("qr")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h7v7h-7z" />
            </svg>
            QR Code do cliente
          </BotaoSecundario>

          {contaAberta ? (
            <BotaoSecundario onClick={() => setModal("dividir")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v18M3 12h18" />
              </svg>
              Dividir ou abater
            </BotaoSecundario>
          ) : null}
        </div>
      </div>

      <AdicionarItens
        clienteId={clienteId}
        produtos={produtos}
        aberto={modal === "itens"}
        aoFechar={() => setModal(null)}
      />

      <DividirConta
        clienteId={clienteId}
        totalCentavos={totalCentavos}
        restanteCentavos={restanteCentavos}
        itens={itens}
        aberto={modal === "dividir"}
        aoFechar={() => setModal(null)}
      />

      <QRModal
        link={link} mensagem={mensagemQr}
        titulo={nomeComanda}
        aberto={modal === "qr"}
        aoFechar={() => setModal(null)}
      />
    </>
  );
}

function BotaoSecundario({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer flex flex-1 items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 px-4 py-3 text-xs md:text-sm font-bold text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
    >
      {children}
    </button>
  );
}