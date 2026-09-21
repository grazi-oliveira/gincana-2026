import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function medal(position: number) {
  return position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : String(position).padStart(2, "0");
}

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: teams }, { data: individuals }] = await Promise.all([
    supabase.rpc("get_team_rankings"),
    supabase.rpc("get_individual_rankings"),
  ]);

  const teamRows = teams ?? [];
  const individualRows = individuals ?? [];
  const myPosition = individualRows.findIndex((row: any) => row.user_id === user.id) + 1;

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1200px] px-5 py-6 sm:px-8 sm:py-9">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[.16em] text-[#419D78]">Gincana 2026</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">Ranking</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#63727b]">Acompanhe a classificação atual das equipes e dos participantes.</p>
          </div>
          <a href="/dashboard" className="rounded-xl border border-[#0C4767]/10 bg-white px-4 py-2.5 text-xs font-extrabold text-[#0C4767]">Voltar ao início</a>
        </header>

        {myPosition > 0 && (
          <section className="gincana-gradient mb-6 rounded-[28px] p-6 text-white gincana-shadow">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/65">Minha classificação</p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-5xl font-extrabold tracking-[-.06em]">#{myPosition}</span>
              <span className="pb-2 text-sm text-white/75">no ranking individual</span>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="gincana-card overflow-hidden">
            <div className="border-b border-[#0C4767]/8 p-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#F7B538]">Competição</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Ranking das equipes</h2>
            </div>
            <div className="divide-y divide-[#0C4767]/7">
              {teamRows.length === 0 && <p className="p-6 text-sm text-[#63727b]">Ainda não há equipes com pontuação.</p>}
              {teamRows.map((team: any, index: number) => (
                <div key={team.team_id} className="flex items-center gap-4 p-4 sm:p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0C4767]/6 text-sm font-extrabold text-[#0C4767]">{medal(index + 1)}</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${team.color}22` }}>{team.emoji || "◆"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0C4767]">{team.name}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0C4767]/8">
                      <div className="h-full rounded-full" style={{ width: `${teamRows[0]?.score > 0 ? Math.max(3, Math.round((team.score / teamRows[0].score) * 100)) : 0}%`, background: team.color || "#0C4767" }} />
                    </div>
                  </div>
                  <p className="text-right text-lg font-extrabold text-[#0C4767]">{team.score}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="gincana-card overflow-hidden">
            <div className="border-b border-[#0C4767]/8 p-6">
              <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#419D78]">Participantes</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Ranking individual</h2>
            </div>
            <div className="divide-y divide-[#0C4767]/7">
              {individualRows.length === 0 && <p className="p-6 text-sm text-[#63727b]">Ainda não há participantes pontuados.</p>}
              {individualRows.map((person: any, index: number) => (
                <div key={person.user_id} className="flex items-center gap-4 p-4 sm:p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0C4767]/6 text-sm font-extrabold text-[#0C4767]">{medal(index + 1)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-[#0C4767]">{person.nickname || person.display_name}</p>
                    <p className="mt-1 text-[10px] text-[#63727b]">Participante</p>
                  </div>
                  <p className="text-right text-lg font-extrabold text-[#0C4767]">{person.score}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <p className="mt-5 text-center text-[10px] leading-5 text-[#63727b]">O ranking mostra somente posição, identificação pública e pontuação.</p>
      </div>
    </main>
  );
}
