import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, nickname, role, team_id")
    .eq("id", user.id)
    .single();

  const name = profile?.nickname || profile?.display_name || user.email?.split("@")[0] || "Participante";

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Gincana 2026</p>
          <h1 className="mt-2 text-3xl font-black">Olá, {name}! 👋</h1>
          <p className="mt-2 text-slate-300">
            Seu acesso foi autenticado. O painel completo será construído sobre o seu perfil e sua equipe.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-4 py-2">Perfil: {profile?.role ?? "pending"}</span>
            <span className="rounded-full bg-white/10 px-4 py-2">
              {profile?.team_id ? "Equipe definida" : "Aguardando equipe"}
            </span>
          </div>
        </header>
      </div>
    </main>
  );
}
