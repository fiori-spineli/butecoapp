import { VoltarPara } from "@/components/voltar";
import { NovaComandaForm } from "./nova-comanda-form";

export const dynamic = "force-dynamic";

export default function NovaComandaPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <VoltarPara href="/dashboard" />
          <h1 className="text-lg md:text-xl font-black text-stone-900 dark:text-stone-100">
            Nova Comanda
          </h1>
        </div>
      </header>

      {/* <main>: o Lighthouse acusou "Document does not have a main
          landmark" nesta tela. Sem o marco, quem usa leitor de tela
          percorre o cabeçalho inteiro antes de chegar ao conteúdo. */}
      <main className="flex flex-1 flex-col">
        <NovaComandaForm />
      </main>
    </>
  );
}