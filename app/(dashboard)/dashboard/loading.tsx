import { LoadingButeco } from "@/components/loading-buteco";

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-12 min-h-[60vh]">
      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-6 py-4 shadow-sm">
        <LoadingButeco />
      </div>
    </div>
  );
}