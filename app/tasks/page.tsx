import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskList from "@/components/tasks/task-list";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, frequency, due_at, personal_points, team_points, status")
    .eq("assigned_to", user.id)
    .eq("status", "active")
    .order("due_at", { ascending: true });

  const { data: submissions } = await supabase
    .from("task_submissions")
    .select("id, task_id, text_content, status, submitted_at")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  const latestByTask = new Map<string, any>();
  (submissions ?? []).forEach(item => {
    if (!latestByTask.has(item.task_id)) latestByTask.set(item.task_id, item);
  });

  const hydrated = (tasks ?? []).map(task => ({
    ...task,
    submission: latestByTask.get(task.id) ?? null,
  }));

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto min-h-screen max-w-[1100px] px-5 py-6 sm:px-8 sm:py-9">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#419D78]">Gincana 2026</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">Minhas tarefas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#63727b]">
              Entregue suas respostas antes do prazo. Enquanto a entrega aguarda a validação do ADM, não há penalidade.
            </p>
          </div>
          <a href="/dashboard" className="rounded-xl border border-[#0C4767]/10 bg-white px-4 py-2.5 text-xs font-extrabold text-[#0C4767]">
            Voltar
          </a>
        </header>
        <TaskList initialTasks={hydrated} />
      </div>
    </main>
  );
}
