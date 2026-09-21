import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskForm from "@/components/admin/task-form";

export default async function AdminTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role,team_id").eq("id",user.id).single();
  if (!profile || !["admin","team_leader"].includes(profile.role)) redirect("/dashboard");

  const [{ data: teams }, { data: profiles }] = await Promise.all([
    supabase.from("teams").select("id,name").order("name"),
    supabase.from("profiles").select("id,display_name,nickname,team_id,role").in("role",["team","team_leader"]).order("display_name"),
  ]);

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1100px] p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#419D78]">GINCANA 2026 · {profile.role === "admin" ? "ADM" : "LÍDER"}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">Inserir tarefa</h1>
          </div>
          <a href="/dashboard" className="rounded-xl bg-[#0C4767] px-4 py-3 text-xs font-extrabold text-white">Voltar</a>
        </div>
        <TaskForm role={profile.role} currentTeamId={profile.team_id} teams={(teams ?? []) as any} profiles={(profiles ?? []) as any} />
      </div>
    </main>
  );
}
