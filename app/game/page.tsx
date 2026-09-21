import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GameBoard from "@/components/game/game-board";

export default async function GamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("display_name,nickname,role,team_id").eq("id", user.id).single();
  if (!profile || !["team","team_leader","admin"].includes(profile.role)) redirect("/dashboard");

  const [{ data: individualBoard }, { data: teamBoard }] = await Promise.all([
    supabase.from("game_boards").select("*").eq("scope","individual").single(),
    supabase.from("game_boards").select("*").eq("scope","team").single(),
  ]);

  const [{ data: playerProfiles }, { data: allIndividualProgress }, { data: teamRows }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,nickname,role,team_id").in("role", ["team","team_leader"]),
    supabase.from("game_progress").select("user_id,position").eq("board_id", individualBoard.id),
    supabase.from("teams").select("id,name,color"),
  ]);

  const teamColorById = new Map((teamRows ?? []).map((team: any) => [team.id, team.color]));
  const progressByUserId = new Map((allIndividualProgress ?? []).map((row: any) => [row.user_id, Number(row.position ?? 0)]));
  const individualPlayers = (playerProfiles ?? []).map((player: any) => ({
    id: player.id,
    name: player.nickname || player.display_name || "Jogador",
    position: progressByUserId.get(player.id) ?? 0,
    color: player.id === user.id ? "#0C4767" : (teamColorById.get(player.team_id) || "#419D78"),
    current: player.id === user.id,
  })).filter((player: any) => player.position > 0 || player.id === user.id);

  const [{ data: individualSquares }, { data: teamSquares }, { data: individualProgress }, { data: teamProgress }, { data: individualEvents }, { data: teamEvents }, { data: individualWallet }, { data: teamWallet }] = await Promise.all([
    supabase.from("game_squares").select("*").eq("board_id", individualBoard.id).eq("active",true).order("position"),
    supabase.from("game_squares").select("*").eq("board_id",teamBoard.id).eq("active",true).order("position"),
    supabase.from("game_progress").select("position").eq("board_id",individualBoard.id).eq("user_id",user.id).maybeSingle(),
    profile.team_id ? supabase.from("game_progress").select("position").eq("board_id",teamBoard.id).eq("team_id",profile.team_id).maybeSingle() : Promise.resolve({data:null}),
    supabase.from("game_events").select("id,square_id,user_id,team_id,status,choice_mode,reward_snapshot,beneficiary_user_id,selected_option_index").eq("board_id",individualBoard.id).eq("user_id",user.id).eq("status","pending").order("triggered_at"),
    profile.team_id ? supabase.from("game_events").select("id,square_id,user_id,team_id,status,choice_mode,reward_snapshot,beneficiary_user_id,selected_option_index").eq("board_id",teamBoard.id).eq("team_id",profile.team_id).eq("status","pending").order("triggered_at") : Promise.resolve({data:[]}),
    supabase.from("game_wallets").select("dracmas").eq("user_id",user.id).maybeSingle(),
    profile.team_id ? supabase.from("game_wallets").select("dracmas").eq("team_id",profile.team_id).maybeSingle() : Promise.resolve({data:null}),
  ]);

  const myTeam = (teamRows ?? []).find((team: any) => team.id === profile.team_id);
  const teamPlayers = profile.team_id ? [{
    id: profile.team_id,
    name: myTeam?.name || "Minha equipe",
    position: Number(teamProgress?.position ?? 0),
    color: myTeam?.color || "#419D78",
    current: true,
  }] : [];

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#419D78]">GINCANA 2026</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">Sua jornada 🎲</h1>
            <p className="mt-2 text-sm text-[#63727b]">Dracmas, movimentos, casas especiais e recompensas são independentes da pontuação do ranking.</p>
          </div>
          <a href="/dashboard" className="rounded-xl bg-[#0C4767] px-4 py-3 text-xs font-extrabold text-white">Voltar ao painel</a>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <GameBoard
            board={individualBoard}
            initialProgress={individualProgress}
            squares={individualSquares ?? []}
            initialEvents={individualEvents ?? []}
            initialWallet={Number(individualWallet?.dracmas ?? 0)}
            userId={user.id}
            teamId={profile.team_id}
            isLeader={profile.role === "team_leader" || profile.role === "admin"}
            players={individualPlayers}
          />
          <GameBoard
            board={teamBoard}
            initialProgress={teamProgress}
            squares={teamSquares ?? []}
            initialEvents={teamEvents ?? []}
            initialWallet={Number(teamWallet?.dracmas ?? 0)}
            userId={user.id}
            teamId={profile.team_id}
            isLeader={profile.role === "team_leader" || profile.role === "admin"}
            players={teamPlayers}
          />
        </div>
      </div>
    </main>
  );
}
