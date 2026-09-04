import { VoltarPara } from "@/components/voltar";
import { NovoProdutoForm } from "./novo-produto-form";

export const dynamic = "force-dynamic";

export default function NovoProdutoPage() {
  return (
    <>
      <header className="flex items-center gap-3.5 border-b border-stone-300 bg-white px-5 pt-5 pb-4">
        <VoltarPara href="/produtos" />
        <h1 className="text-lg font-bold">Novo produto</h1>
      </header>

      <NovoProdutoForm />
    </>
  );
}
