import { exigirBar } from "@/lib/bar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await exigirBar();

  return (
    <div className="min-h-screen w-full bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col border-x border-stone-200/80 dark:border-stone-800/80 bg-stone-50 dark:bg-stone-900 shadow-sm">
        {children}
      </div>
    </div>
  );
}