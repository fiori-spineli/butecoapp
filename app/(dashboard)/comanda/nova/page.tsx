import { VoltarPara } from "@/components/voltar";
import { NovaComandaForm } from "./nova-comanda-form";

export const dynamic = "force-dynamic";

export default function NovaComandaPage() {
  return (
    <>
      <header className="flex items-center gap-3.5 border-b border-stone-300 bg-white px-5 pt-5 pb-4">
        <VoltarPara href="/dashboard" />
        <h1 className="text-lg font-bold">Nova comanda</h1>
      </header>

      <NovaComandaForm />
    </>
  );
}
