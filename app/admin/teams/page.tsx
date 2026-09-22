import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeamForm from "@/components/admin/team-form";

export default async function AdminTeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const { data: teams } = await supabase
    .from("teams")
    .select("id,name,color,emoji")
    .order("name");

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-[900px] p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#419D78]">ADM · GINCANA 2026</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">Equipes</h1>
          </div>
          <a href="/admin" className="rounded-xl bg-[#0C4767] px-4 py-3 text-xs font-extrabold text-white">Voltar</a>
        </div>
        <TeamForm teams={(teams ?? []) as any} />
      </div>
    </main>
  );
}
