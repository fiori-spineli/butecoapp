import { LoadingButeco } from "@/components/loading-buteco";

export default function LoadingGlobal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/20 dark:bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 px-6 py-4 shadow-xl shadow-stone-900/10 dark:shadow-black/50">
        <LoadingButeco />
      </div>
    </div>
  );
}