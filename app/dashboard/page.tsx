import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const navItems = [
  ["⌂", "Início"],
  ["✓", "Tarefas"],
  ["↗", "Ranking"],
  ["✦", "Mural"],
];

function Progress({ value, color = "#419D78" }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#0C4767]/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, nickname, role, team_id")
    .eq("id", user.id)
    .single();

  let teamName = "Equipe ainda não definida";
  let teamColor = "#0C4767";

  if (profile?.team_id) {
    const { data: team } = await supabase
      .from("teams")
       .select("name, color")
      .eq("id", profile.team_id)
      .maybeSingle();
    teamName = team?.name ?? teamName;
    teamColor = team?.color ?? teamColor;
  }

  const name = profile?.nickname || profile?.display_name || user.email?.split("@")[0] || "Participante";

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ data: activeTasks }, { data: submissions }, { data: scoreEntries }, { data: teamRankings }, { data: individualRankings }] = await Promise.all([
    supabase.from("tasks").select("id, due_at, frequency").eq("assigned_to", user.id).eq("status", "active").order("due_at", { ascending: true }),
    supabase.from("task_submissions").select("task_id, status, submitted_at").eq("user_id", user.id),
    supabase.from("score_entries").select("points, entry_type, created_at").eq("user_id", user.id),
    supabase.rpc("get_team_rankings"),
    supabase.rpc("get_individual_rankings"),
  ]);

  const personalScore = (scoreEntries ?? []).reduce((sum, entry) => sum + Number(entry.points || 0), 0);
  const currentTeamRanking = (teamRankings ?? []).find((team: any) => team.team_id === profile?.team_id);
  const teamScore = currentTeamRanking?.score ?? 0;
  const topTeamScore = Math.max(0, ...(teamRankings ?? []).map((team: any) => Number(team.score || 0)));
  const teamRank = (teamRankings ?? []).findIndex((team: any) => team.team_id === profile?.team_id) + 1;
  const individualRank = (individualRankings ?? []).findIndex((person: any) => person.user_id === user.id) + 1;
  const taskList = activeTasks ?? [];
  const submissionMap = new Map((submissions ?? []).map(item => [item.task_id, item]));
  const completedTasks = taskList.filter(task => submissionMap.get(task.id)?.status === "validated").length;
  const progress = taskList.length ? Math.round((completedTasks / taskList.length) * 100) : 0;
  const todayTasks = taskList.filter(task => new Date(task.due_at).toDateString() === now.toDateString()).length;
  const weekTasks = taskList.filter(task => new Date(task.due_at) >= startOfWeek).length;
  const monthTasks = taskList.filter(task => new Date(task.due_at) >= startOfMonth).length;
  const firstName = name.split(" ")[0];

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-[250px] shrink-0 border-r border-[#0C4767]/10 bg-white/80 p-5 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="gincana-gradient-warm flex h-11 w-11 items-center justify-center rounded-2xl text-xl">🏆</div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[.22em] text-[#419D78]">GINCANA</p>
              <p className="text-lg font-extrabold tracking-[-.04em] text-[#0C4767]">2026</p>
            </div>
          </div>

          <nav className="mt-9 space-y-1">
            {navItems.map(([icon, label], index) => (
              <div key={label} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${index === 0 ? "bg-[#0C4767] text-white" : "text-[#63727b]"}`}>
                <span className="text-base">{icon}</span>{label}
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl bg-[#F7B538]/15 p-4">
            <p className="text-xs font-bold text-[#0C4767]">Gincana 2026</p>
            <p className="mt-1 text-[11px] leading-5 text-[#63727b]">Cada tarefa conta. Cada ponto aproxima a equipe.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0C4767]/10 bg-[#f7f8f5]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#419D78]">Painel</p>
              <p className="text-sm font-extrabold text-[#0C4767] lg:hidden">GINCANA 2026</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-bold text-[#0C4767]">{name}</p>
                <p className="text-[10px] text-[#63727b]">{teamName}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0C4767] text-sm font-extrabold text-white">
                {name.slice(0, 1).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="p-5 sm:p-8">
            <section className="gincana-gradient relative overflow-hidden rounded-[30px] p-6 text-white gincana-shadow sm:p-8">
              <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
              <div className="absolute -bottom-24 right-28 h-40 w-40 rounded-full bg-[#F7B538]/20 blur-2xl" />
              <div className="relative max-w-2xl">
                <p className="text-xs font-semibold text-white/70">BEM-VINDA À GINCANA 2026</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-[-.045em] sm:text-4xl">Olá, {firstName}! 👋</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                  Acompanhe suas tarefas, seu progresso e a posição da sua equipe em um só lugar.
                </p>
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Tarefas de hoje", String(todayTasks), todayTasks === 1 ? "tarefa disponível" : "tarefas disponíveis", "#F7B538", "✓"],
                ["Meu progresso", `${progress}%`, `${completedTasks} de ${taskList.length} validadas`, "#419D78", "↗"],
                ["Pontuação pessoal", String(personalScore), "pontos", "#0C4767", "★"],
                ["Minha equipe", teamName, "equipe atual", teamColor, "◆"],
              ].map(([label, value, sub, color, icon]) => (
                <div key={label} className="gincana-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[.12em] text-[#63727b]">{label}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl text-sm font-extrabold text-white" style={{ background: color }}>{icon}</span>
                  </div>
                  <p className="mt-5 truncate text-2xl font-extrabold tracking-[-.05em] text-[#0C4767]">{value}</p>
                  <p className="mt-1 text-[11px] text-[#63727b]">{sub}</p>
                </div>
              ))}
            </section>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <section className="gincana-card p-6 sm:p-7">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#419D78]">Acompanhamento</p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Meu progresso</h2>
                  </div>
                  <span className="text-sm font-extrabold text-[#0C4767]">{completedTasks} / {taskList.length}</span>
                </div>
                <div className="mt-6 space-y-5">
                  {[
                    ["Hoje", taskList.filter(task => new Date(task.due_at).toDateString() === now.toDateString()).length ? Math.round((taskList.filter(task => new Date(task.due_at).toDateString() === now.toDateString() && submissionMap.get(task.id)?.status === "validated").length / taskList.filter(task => new Date(task.due_at).toDateString() === now.toDateString()).length) * 100) : 0, "#F7B538"],
                    ["Esta semana", weekTasks ? Math.round((taskList.filter(task => new Date(task.due_at) >= startOfWeek && submissionMap.get(task.id)?.status === "validated").length / weekTasks) * 100) : 0, "#419D78"],
                    ["Este mês", monthTasks ? Math.round((taskList.filter(task => new Date(task.due_at) >= startOfMonth && submissionMap.get(task.id)?.status === "validated").length / monthTasks) * 100) : 0, "#0C4767"],
                  ].map(([label, value, color]) => (
                    <div key={label}>
                      <div className="mb-2 flex justify-between text-xs font-semibold text-[#63727b]">
                        <span>{label}</span><span>{String(value)}%</span>
                      </div>
                      <Progress value={Number(value)} color={String(color)} />
                    </div>
                  ))}
                </div>
              </section>

              <section className="gincana-card p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#E63946]">Próximas ações</p>
                    <div className="flex items-center justify-between gap-3">
                    <h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Tarefas</h2>
                    <a href="/tasks" className="rounded-xl bg-[#0C4767] px-3 py-2 text-[10px] font-extrabold text-white">Ver tarefas</a>
                  </div>
                  <span className="rounded-full bg-[#E63946]/10 px-3 py-1 text-[10px] font-bold text-[#E63946]">{taskList.filter(task => !submissionMap.get(task.id)).length} pendentes</span>
                </div>
                <div className="mt-6 rounded-2xl border border-dashed border-[#0C4767]/15 p-5">
                  <p className="text-sm font-bold text-[#0C4767]">{taskList.length ? `${taskList.length} tarefa(s) ativa(s)` : "Nenhuma tarefa disponível"}</p>
                  <p className="mt-1 text-xs leading-5 text-[#63727b]">{taskList.length ? "Acesse a área de tarefas para enviar suas entregas." : "As tarefas atribuídas a você aparecerão aqui com prazo e status."}</p>
                </div>
              </section>
            </div>

            <section className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="gincana-card p-6">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#F7B538]">Ranking</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Classificação</h2>
                <a href="/ranking" className="mt-5 block rounded-2xl bg-[#0C4767] p-5 text-white transition hover:-translate-y-0.5">
                  <p className="text-xs text-white/60">Sua posição aparecerá aqui</p>
                  <p className="mt-2 text-3xl font-extrabold">—</p>
                  <p className="mt-1 text-xs text-white/70">#{individualRank || "—"} individual · {personalScore} pontos</p>
              </a>
              </div>

              <div className="gincana-card p-6">
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#419D78]">Equipe</p>
                <h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">{teamName}</h2>
                <div className="mt-5 flex items-center gap-4 rounded-2xl bg-[#419D78]/10 p-5">
                  <span className="text-3xl">◆</span>
                  <div>
                    <p className="text-sm font-bold text-[#0C4767]">Progresso da equipe</p>
                    <p className="mt-1 text-[10px] text-[#63727b]">{teamRank || "—"} · {teamScore} pontos</p>
                    <div className="mt-3 w-full min-w-40"><Progress value={topTeamScore ? Math.round((teamScore / topTeamScore) * 100) : 0} color={teamColor} /></div>
                  </div>
                </div>
              </div>
            </section>

            <nav className="mt-6 grid grid-cols-4 gap-2 rounded-2xl border border-[#0C4767]/10 bg-white p-2 lg:hidden">
              {navItems.map(([icon, label], index) => (
                <div key={label} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-bold ${index === 0 ? "bg-[#0C4767] text-white" : "text-[#63727b]"}`}>
                  <span className="text-base">{icon}</span>{label}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </main>
  );
}
