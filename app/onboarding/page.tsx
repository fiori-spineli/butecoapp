import { redirect } from "next/navigation";
import { contextoDoDono } from "@/lib/bar";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { bar } = await contextoDoDono();
  if (bar) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-7 py-10">
      <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.18em] text-stone-500">
        ButecoApp
      </p>
      <h1 className="text-center text-2xl font-bold tracking-tight">Como chama seu bar?</h1>
      <p className="mx-auto mt-2.5 mb-7 max-w-[32ch] text-center text-sm leading-relaxed text-stone-500">
        É o nome que seus clientes vão ver quando abrirem a conta pelo celular.
      </p>

      <OnboardingForm />
    </main>
  );
}
