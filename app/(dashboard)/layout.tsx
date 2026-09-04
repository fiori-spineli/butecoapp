import { exigirBar } from "@/lib/bar";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guarda de sessão: manda pro login ou pro onboarding quando faltar algo.
  await exigirBar();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-stone-100">
      {children}
    </div>
  );
}
