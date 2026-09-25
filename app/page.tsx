import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Vitrine } from "@/components/vitrine";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("buteco_session")?.value;

  if (!token) {
    return <Vitrine />;
  }

  try {
    const dados = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));

    if (dados.is_admin) {
      redirect("/admin");
    }

    redirect("/dashboard");
  } catch {
    return <Vitrine />;
  }
}