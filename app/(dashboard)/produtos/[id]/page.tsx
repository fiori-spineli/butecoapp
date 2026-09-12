import { notFound } from "next/navigation";
import { exigirBar } from "@/lib/bar";
import { VoltarPara } from "@/components/voltar";
import { EditarProdutoForm } from "./editar-produto-form";
import type { Produto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, bar } = await exigirBar();

  const { data: produto } = await supabase
    .from("produtos")
    .select("*")
    .eq("id", id)
    .eq("bar_id", bar.id)
    .maybeSingle();

  if (!produto) notFound();

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <VoltarPara href="/produtos" />
          <h1 className="text-lg md:text-xl font-black text-stone-900 dark:text-stone-100">
            Editar Produto
          </h1>
        </div>
      </header>

      <EditarProdutoForm produto={produto as Produto} />
    </>
  );
}