import { formatarDataHora, formatarDataHoraCompleta, formatarMomento, formatarReais } from "@/lib/format";

export type DadosComprovante = {
  barNome: string;
  clienteNome: string;
  numeroMesa: string | null;
  status: "aberta" | "fechada";
  abertaEm: string;
  fechadaEm: string | null;
  itens: {
    id: string;
    nome: string;
    quantidade: number;
    valorUnitarioCentavos: number;
    criadoEm: string | null;
  }[];
  pagamentos: {
    id: string;
    descricao: string | null;
    valorCentavos: number;
    criadoEm: string;
  }[];
  totalCentavos: number;
  pagoCentavos: number;
  restanteCentavos: number;
  /** Instante da emissão, para a folha do dono. A do cliente não leva. */
  emitidoEm?: string;
};

/**
 * A comanda como folha de papel — o que sai no "Imprimir / Salvar PDF".
 *
 * Invisível na tela (`hidden print:block`); na impressão, o CSS global esconde
 * tudo e revela só o que está em `.folha`. É a mesma folha para o dono (na
 * página da comanda) e para o cliente (na página do QR), porque o comprovante
 * que o bar manda tem que ser idêntico ao que o cliente vê.
 *
 * Não é documento fiscal, e a folha diz isso: cupom fiscal é outra coisa, com
 * outra lei, e o app não emite.
 */
export function ComprovanteComanda({ dados }: { dados: DadosComprovante }) {
  const fechada = dados.status === "fechada";
  const titulo = dados.numeroMesa ? `Mesa ${dados.numeroMesa} · ${dados.clienteNome}` : dados.clienteNome;

  return (
    <section className="folha hidden print:block text-stone-900" aria-hidden>
      <div className="mx-auto w-full max-w-3xl">
        <div className="borda-papel flex flex-wrap items-end justify-between gap-2 border-b-2 border-stone-800 pb-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">{dados.barNome}</h2>
            <p className="text-sm font-semibold text-stone-600">Comanda — {titulo}</p>
          </div>
          <div className="text-right text-xs text-stone-600">
            <p>Aberta em {formatarDataHoraCompleta(dados.abertaEm)}</p>
            {fechada && dados.fechadaEm ? (
              <p>Fechada em {formatarDataHoraCompleta(dados.fechadaEm)}</p>
            ) : (
              <p className="font-bold">Conta em aberto — extrato parcial</p>
            )}
          </div>
        </div>

        <h3 className="mt-6 text-sm font-black uppercase tracking-wider">Itens ({dados.itens.length})</h3>

        {dados.itens.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">Nenhum item lançado.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="borda-papel border-b border-stone-300 text-[10px] uppercase tracking-wider text-stone-500">
                <th className="py-2 pr-3 font-bold">Hora</th>
                <th className="py-2 pr-3 font-bold">Item</th>
                <th className="py-2 pr-3 text-right font-bold">Qtd</th>
                <th className="py-2 pr-3 text-right font-bold">Unit.</th>
                <th className="py-2 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {dados.itens.map((item) => (
                <tr key={item.id} className="borda-papel border-b border-stone-200">
                  <td className="py-2 pr-3 tabular-nums text-stone-600">
                    {item.criadoEm ? formatarMomento(item.criadoEm) : "—"}
                  </td>
                  <td className="py-2 pr-3 font-bold">{item.nome}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{item.quantidade}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatarReais(item.valorUnitarioCentavos)}</td>
                  <td className="py-2 text-right font-bold tabular-nums">
                    {formatarReais(item.quantidade * item.valorUnitarioCentavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {dados.pagamentos.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-black uppercase tracking-wider">Pagamentos ({dados.pagamentos.length})</h3>
            <table className="mt-2 w-full border-collapse text-left text-xs">
              <tbody>
                {dados.pagamentos.map((p) => (
                  <tr key={p.id} className="borda-papel border-b border-stone-200">
                    <td className="py-2 pr-3 tabular-nums text-stone-600">{formatarDataHora(p.criadoEm)}</td>
                    <td className="py-2 pr-3">{p.descricao || "Pagamento registrado"}</td>
                    <td className="py-2 text-right font-bold tabular-nums">- {formatarReais(p.valorCentavos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="borda-papel mt-6 ml-auto w-full max-w-xs border-t-2 border-stone-800 pt-3 text-sm">
          <div className="flex justify-between py-0.5">
            <span>Consumo</span>
            <span className="font-bold tabular-nums">{formatarReais(dados.totalCentavos)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Pago</span>
            <span className="font-bold tabular-nums">{formatarReais(dados.pagoCentavos)}</span>
          </div>
          <div className="flex justify-between py-1 text-base font-black">
            <span>{fechada ? "Conta paga" : "Falta pagar"}</span>
            <span className="tabular-nums">{formatarReais(fechada ? 0 : dados.restanteCentavos)}</span>
          </div>
        </div>

        <p className="mt-8 text-center text-[10px] text-stone-500">
          ButecoApp · {dados.barNome} · controle interno da comanda, sem valor fiscal
          {dados.emitidoEm ? ` · emitido em ${formatarDataHoraCompleta(dados.emitidoEm)}` : ""}
        </p>
      </div>
    </section>
  );
}
