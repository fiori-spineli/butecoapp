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
      <div className="sticky bottom-0 flex flex-col gap-2 border-t border-stone-300 bg-white px-4 pt-3 pb-5">
        {contaAberta ? (
          <button
            type="button"
            onClick={() => setModal("itens")}
            className="flex items-center justify-center gap-2 rounded-lg bg-stone-900 px-4 py-3.5 font-semibold text-white hover:bg-stone-800"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Adicionar item
          </button>
        ) : null}

        <div className="flex gap-2">
          <BotaoSecundario onClick={() => setModal("qr")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <path d="M14 14h7v7h-7z" />
            </svg>
            QR Code
          </BotaoSecundario>

          {contaAberta ? (
            <BotaoSecundario onClick={() => setModal("dividir")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v18M3 12h18" />
              </svg>
              Dividir conta
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
        link={link}
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
      className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-stone-900 px-3 py-3 text-sm font-semibold text-stone-900"
    >
      {children}
    </button>
  );
}
