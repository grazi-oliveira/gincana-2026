import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GameSummaryCard from "@/components/game/game-summary-card";
import NicknamePrompt from "@/components/dashboard/nickname-prompt";
import GreetingHeading from "@/components/dashboard/greeting-heading";

const navItems = [
  ["⌂", "Início"],
  ["✓", "Tarefas"],
  ["↗", "Ranking"],
  ["✦", "Mural"],
];

function PendingScreen({ name }: { name: string }) {
  return (
    <main className="gincana-grid flex min-h-screen items-center justify-center px-5 py-10">
      <section className="gincana-card w-full max-w-[440px] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F7B538]/15 text-3xl">⏳</div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-.04em] text-[#0C4767]">Olá, {name}!</h1>
        <p className="mt-3 text-sm leading-6 text-[#63727b]">
          Seu acesso foi confirmado, mas um administrador ainda precisa colocar você em uma equipe. Assim que isso acontecer, seu painel aparece aqui.
        </p>
      </section>
    </main>
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

  const displayName = profile?.nickname || profile?.display_name || user.email?.split("@")[0] || "Participante";

  if (profile && !profile.nickname) {
    return <NicknamePrompt suggestedName={profile.display_name ?? ""} />;
  }

  if (profile?.role === "pending") {
    return <PendingScreen name={displayName.split(" ")[0]} />;
  }

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

  const name = displayName;
  const isLeader = profile?.role === "team_leader";

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
  const teamRank = (teamRankings ?? []).findIndex((team: any) => team.team_id === profile?.team_id) + 1;
  const individualRank = (individualRankings ?? []).findIndex((person: any) => person.user_id === user.id) + 1;
  let teamMembers: { id: string; name: string; pendingCount: number; status: "em_dia" | "pendente" }[] = [];
  if (isLeader && profile?.team_id) {
    const [{ data: members }, { data: teamActiveTasks }, { data: teamSubmissions }] = await Promise.all([
      supabase.from("profiles").select("id,display_name,nickname").eq("team_id", profile.team_id).in("role", ["team", "team_leader"]),
      supabase.from("tasks").select("id,assigned_to").eq("team_id", profile.team_id).eq("status", "active"),
      supabase.from("task_submissions").select("task_id,user_id").in("status", ["submitted", "validated"]),
    ]);
    const submittedTaskIds = new Set((teamSubmissions ?? []).map(s => `${s.user_id}:${s.task_id}`));
    teamMembers = (members ?? []).map(member => {
      const memberTasks = (teamActiveTasks ?? []).filter(t => t.assigned_to === member.id);
      const pendingCount = memberTasks.filter(t => !submittedTaskIds.has(`${member.id}:${t.id}`)).length;
      return {
        id: member.id,
        name: member.nickname || member.display_name,
        pendingCount,
        status: pendingCount > 0 ? "pendente" : "em_dia",
      };
    });
  }

  const taskList = activeTasks ?? [];
  const submissionMap = new Map((submissions ?? []).map(item => [item.task_id, item]));
  const completedTasks = taskList.filter(task => submissionMap.get(task.id)?.status === "validated").length;
  const todayTasks = taskList.filter(task => new Date(task.due_at).toDateString() === now.toDateString()).length;
  const weekTasks = taskList.filter(task => new Date(task.due_at) >= startOfWeek).length;
  const monthTasks = taskList.filter(task => new Date(task.due_at) >= startOfMonth).length;
  const firstName = name.split(" ")[0];

  const [{ data: boards }, { data: wallet }] = await Promise.all([
    supabase.from("game_boards").select("id,scope,name,total_squares"),
    supabase.from("game_wallets").select("dracmas").eq("user_id",user.id).maybeSingle(),
  ]);

  const individualBoard = (boards ?? []).find(board => board.scope === "individual");
  const teamBoard = (boards ?? []).find(board => board.scope === "team");

  const [{ data: individualProgress }, { data: teamProgress }] = await Promise.all([
    individualBoard
      ? supabase.from("game_progress").select("position").eq("board_id", individualBoard.id).eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    teamBoard && profile?.team_id
      ? supabase.from("game_progress").select("position").eq("board_id", teamBoard.id).eq("team_id", profile.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-[250px] shrink-0 border-r border-[#0C4767]/10 bg-white/80 p-5 backdrop-blur-xl lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="gincana-gradient-warm flex h-11 w-11 items-center justify-center rounded-2xl text-xl">🏆</div>
            <div>
              <p className="text-lg font-extrabold leading-none tracking-[-.03em] text-[#0C4767]">Gincana</p>
              <p className="text-sm font-bold leading-none text-[#419D78]">2026</p>
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
            <p className="text-xs font-bold text-[#0C4767]">Cada tarefa conta.</p>
            <p className="mt-1 text-[11px] leading-5 text-[#63727b]">Cada ponto aproxima a sua equipe do topo.</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#0C4767]/10 bg-[#f7f8f5]/90 px-5 py-4 backdrop-blur-xl sm:px-8">
            <p className="text-sm font-extrabold text-[#0C4767] lg:hidden">Gincana 2026</p>
            <div className="ml-auto flex items-center gap-3">
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
              <div className="relative flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-xl">
                  <GreetingHeading firstName={firstName} />
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">
                    {isLeader
                      ? "Sua equipe, suas tarefas e a posição no ranking geral — tudo aqui."
                      : "Suas tarefas, seu progresso e a posição da sua equipe, tudo aqui."}
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/12 py-2.5 pl-2.5 pr-4 backdrop-blur-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: `${teamColor}` }}>
                    ◆
                  </span>
                  <div>
                    <p className="text-[10px] text-white/65">{isLeader ? "Você lidera" : "Sua equipe"}</p>
                    <p className="text-sm font-extrabold">{teamName}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
              <div className="ticket p-6 sm:p-7">
                <div className="ticket-notch left" />
                <div className="ticket-notch right" />
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Sua trilha</h2>
                  <span className="text-sm font-extrabold text-[#0C4767]">{completedTasks} de {taskList.length} concluídas</span>
                </div>
                <div className="trail mt-8">
                  {[
                    ["Hoje", taskList.filter(task => new Date(task.due_at).toDateString() === now.toDateString()).length ? Math.round((taskList.filter(task => new Date(task.due_at).toDateString() === now.toDateString() && submissionMap.get(task.id)?.status === "validated").length / taskList.filter(task => new Date(task.due_at).toDateString() === now.toDateString()).length) * 100) : 0],
                    ["Esta semana", weekTasks ? Math.round((taskList.filter(task => new Date(task.due_at) >= startOfWeek && submissionMap.get(task.id)?.status === "validated").length / weekTasks) * 100) : 0],
                    ["Este mês", monthTasks ? Math.round((taskList.filter(task => new Date(task.due_at) >= startOfMonth && submissionMap.get(task.id)?.status === "validated").length / monthTasks) * 100) : 0],
                  ].map(([label, value]) => (
                    <div key={label} className="trail-node">
                      <div className="trail-connector" />
                      <div className={`trail-dot ${Number(value) >= 100 ? "is-done" : ""}`} />
                      <p className="mt-3 text-2xl font-extrabold tracking-[-.04em] text-[#0C4767]">{value}%</p>
                      <p className="text-xs text-[#63727b]">{label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs text-[#63727b]">
                  {todayTasks === 0 ? "Nenhuma tarefa vence hoje." : `${todayTasks} ${todayTasks === 1 ? "tarefa vence" : "tarefas vencem"} hoje.`}
                </p>
              </div>

              <div className="grid grid-rows-2 gap-4">
                <div className="stat-block gincana-gradient-warm">
                  <p className="text-xs text-white/75">Sua pontuação</p>
                  <p className="mt-1 text-3xl font-extrabold tracking-[-.04em]">{personalScore}</p>
                  <p className="text-xs text-white/75">{individualRank ? `#${individualRank} no ranking individual` : "ainda sem colocação"}</p>
                </div>
                <div className="stat-block" style={{ background: teamColor }}>
                  <p className="text-xs text-white/75">{teamName}</p>
                  <p className="mt-1 text-3xl font-extrabold tracking-[-.04em]">{teamScore}</p>
                  <p className="text-xs text-white/75">{teamRank ? `#${teamRank} no ranking de equipes` : "ainda sem colocação"}</p>
                </div>
              </div>
            </section>

            <section className="mt-6">
              <div className="ticket p-6 sm:p-7">
                <div className="ticket-notch left" />
                <div className="ticket-notch right" />
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Tarefas</h2>
                  <span className="rounded-full bg-[#E63946]/10 px-3 py-1 text-[10px] font-bold text-[#E63946]">
                    {taskList.filter(task => !submissionMap.get(task.id)).length} pendentes
                  </span>
                </div>
                <p className="mt-1 text-sm text-[#63727b]">
                  {taskList.length ? `${taskList.length} tarefa(s) ativa(s) atribuídas a você.` : "As tarefas atribuídas a você aparecerão aqui com prazo e status."}
                </p>
                <a href="/tasks" className="mt-4 inline-flex rounded-xl bg-[#0C4767] px-4 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5">
                  Ver tarefas
                </a>
              </div>
            </section>

            {isLeader && (
              <section className="ticket mt-6 p-6 sm:p-7">
                <div className="ticket-notch left" />
                <div className="ticket-notch right" />
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Quem está em dia</h2>
                  <span className="text-sm font-extrabold text-[#0C4767]">
                    {teamMembers.filter(m => m.status === "em_dia").length} / {teamMembers.length}
                  </span>
                </div>
                <div className="mt-5 space-y-1">
                  {teamMembers.length === 0 && <p className="text-sm text-[#63727b]">Nenhum integrante na equipe ainda.</p>}
                  {teamMembers.map(member => (
                    <div key={member.id} className="flex items-center gap-3 border-b border-[#0C4767]/6 py-2.5 last:border-0">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${member.status === "em_dia" ? "bg-[#419D78]" : "bg-[#E63946]"}`} />
                      <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#0C4767]">{member.name}</span>
                      <span className="text-xs text-[#63727b]">
                        {member.status === "em_dia" ? "Em dia" : `${member.pendingCount} pendente(s)`}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-6">
              <GameSummaryCard
                individualPosition={Number(individualProgress?.position ?? 0)}
                individualTotal={Number(individualBoard?.total_squares ?? 100)}
                teamPosition={Number(teamProgress?.position ?? 0)}
                teamTotal={Number(teamBoard?.total_squares ?? 50)}
                dracmas={Number(wallet?.dracmas ?? 0)}
              />
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
