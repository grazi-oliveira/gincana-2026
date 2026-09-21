import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmissionReview from "@/components/admin/submission-review";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id",user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: submissions }, { data: tasks }, { data: teams }, { data: profiles }] = await Promise.all([
    supabase.from("task_submissions").select("id,text_content,submitted_at,task_id,user_id").eq("status","submitted").order("submitted_at",{ascending:true}),
    supabase.from("tasks").select("id,title").order("created_at",{ascending:false}),
    supabase.from("teams").select("id,name").order("name"),
    supabase.from("profiles").select("id,display_name,nickname,team_id").in("role",["team","team_leader"]),
  ]);

  const taskMap = new Map((tasks??[]).map(item=>[item.id,item.title]));
  const teamMap = new Map((teams??[]).map(item=>[item.id,item.name]));
  const profileMap = new Map((profiles??[]).map(item=>[item.id,item]));
  const reviewItems = (submissions??[]).map(item=>{
    const person = profileMap.get(item.user_id);
    return {
      ...item,
      taskTitle: taskMap.get(item.task_id) ?? "Tarefa",
      userName: person?.nickname || person?.display_name || "Participante",
      teamName: teamMap.get(person?.team_id || "") ?? "Equipe",
    };
  });

  const pending = reviewItems.length;
  const activeTasks = (tasks??[]).length;
  const teamCount = (teams??[]).length;
  const participantCount = (profiles??[]).length;

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1300px] p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#E63946]">ADM · GINCANA 2026</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">Central da Gincana</h1>
            <p className="mt-2 text-sm text-[#63727b]">Valide entregas, acompanhe o jogo e configure as jornadas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/admin/tasks" className="rounded-xl bg-[#0C4767] px-4 py-3 text-xs font-extrabold text-white">+ Tarefa</a>
            <a href="/admin/game" className="rounded-xl bg-[#F7B538] px-4 py-3 text-xs font-extrabold text-[#0C4767]">🎲 Configurar jogo</a>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Entregas pendentes",pending,"#E63946","⏳"],
            ["Tarefas",activeTasks,"#419D78","✓"],
            ["Equipes",teamCount,"#0C4767","◆"],
            ["Participantes",participantCount,"#F7B538","👥"],
          ].map(([label,value,color,icon])=>(
            <div key={String(label)} className="gincana-card p-5">
              <div className="flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-[#63727b]">{label}</span><span className="flex h-8 w-8 items-center justify-center rounded-xl text-white" style={{background:String(color)}}>{String(icon)}</span></div>
              <p className="mt-5 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">{String(value)}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_.5fr]">
          <SubmissionReview initialSubmissions={reviewItems as any} />
          <div className="space-y-4">
            <a href="/game" className="gincana-card block p-6 transition hover:-translate-y-0.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#F7B538]">Visualizar</p><h2 className="mt-1 text-lg font-extrabold text-[#0C4767]">Tabuleiros 🎲</h2><p className="mt-2 text-xs leading-5 text-[#63727b]">Veja a jornada como participante.</p></a>
            <a href="/notifications" className="gincana-card block p-6 transition hover:-translate-y-0.5"><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#E63946]">Eventos</p><h2 className="mt-1 text-lg font-extrabold text-[#0C4767]">Notificações 🔔</h2><p className="mt-2 text-xs leading-5 text-[#63727b]">Acompanhe desbloqueios e ações.</p></a>
          </div>
        </div>
      </div>
    </main>
  );
}
