import { VoltarPara } from "@/components/voltar";
import { NovaComandaForm } from "./nova-comanda-form";
import { TemaToggle } from "@/components/tema-toggle";

export const dynamic = "force-dynamic";

export default function NovaComandaPage() {
  return (
    <>
      <header className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <VoltarPara href="/dashboard" />
          <h1 className="text-lg md:text-xl font-black text-stone-900 dark:text-stone-100">
            Nova Comanda
          </h1>
        </div>
        <TemaToggle />
      </header>

      <NovaComandaForm />
    </>
  );
}