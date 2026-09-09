import { LoadingButeco } from "@/components/loading-buteco";

export default function AuthLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-stone-100 dark:bg-stone-950 p-6">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4 shadow-sm">
        <LoadingButeco />
      </div>
    </div>
  );
}