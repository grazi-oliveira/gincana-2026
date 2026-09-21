"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Board = { id: string; scope: "individual" | "team"; name: string; total_squares: number; final_reward: Record<string, unknown> };
type Square = { id: string; position: number; type: "normal" | "gold" | "silver" | "bronze" | "final"; title: string | null; description: string | null; reward_config: Record<string, any>; choice_mode: "participant" | "leader" | "team" | null };
type Progress = { position: number };
type GameEvent = { id: string; square_id: string; user_id: string | null; team_id: string | null; status: "pending" | "resolved" | "cancelled"; choice_mode: "participant" | "leader" | "team" | null; reward_snapshot: Record<string, any>; beneficiary_user_id: string | null; selected_option_index: number | null };
type Member = { id: string; display_name: string; nickname: string | null; role: string };
type Player = { id: string; name: string; position: number; color: string; current?: boolean };

const palette: Record<Square["type"], { bg: string; text: string; label: string }> = {
  normal: { bg: "#ffffff", text: "#0C4767", label: "NORMAL" },
  gold: { bg: "#F7B538", text: "#6d4700", label: "DOURADA" },
  silver: { bg: "#AAB3B8", text: "#24313a", label: "PRATA" },
  bronze: { bg: "#B7794B", text: "#4b2b16", label: "BRONZE" },
  final: { bg: "#0C4767", text: "#ffffff", label: "FINAL" },
};

function squareStyle(type: Square["type"]) {
  return type === "normal" ? { background: "#ffffff", border: "1px solid rgba(12,71,103,.10)" } : { background: palette[type].bg, color: palette[type].text, border: "1px solid rgba(12,71,103,.14)" };
}

function rewardLabel(reward: any) {
  if (!reward) return "Prêmio";
  const amount = Number(reward.amount || 0);
  if (reward.type === "dracmas") return `+${amount} dracmas`;
  if (reward.type === "movement") return `+${amount} casas`;
  if (reward.type === "personal_points") return `+${amount} pontos pessoais`;
  if (reward.type === "team_points") return `+${amount} pontos da equipe`;
  return "Recompensa";
}

export default function GameBoard({ board, initialProgress, squares, initialEvents, initialWallet, userId, teamId, isLeader, players = [] }: {
  board: Board;
  initialProgress: Progress | null;
  squares: Square[];
  initialEvents: GameEvent[];
  initialWallet: number;
  userId: string;
  teamId: string | null;
  isLeader: boolean;
  players?: Player[];
}) {
  const supabase = createClient();
  const [displayPosition, setDisplayPosition] = useState(initialProgress?.position ?? 0);
  const [targetPosition, setTargetPosition] = useState(initialProgress?.position ?? 0);
  const [events, setEvents] = useState(initialEvents);
  const [wallet, setWallet] = useState(initialWallet);
  const [members, setMembers] = useState<Member[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Record<string, string>>({});
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const squareMap = useMemo(() => new Map(squares.map(square => [square.id, square])), [squares]);
  const pendingEvents = events.filter(event => event.status === "pending");
  const perimeter = useMemo(() => {
    const size = 26;
    const cells: { position: number; x: number; y: number }[] = [];
    for (let x = 0; x < size; x++) cells.push({ position: x + 1, x, y: 0 });
    for (let y = 1; y < size; y++) cells.push({ position: 25 + y + 1, x: size - 1, y });
    for (let x = size - 2; x >= 0; x--) cells.push({ position: 51 + (size - 1 - x), x, y: size - 1 });
    for (let y = size - 2; y > 0; y--) cells.push({ position: 76 + (size - 1 - y), x: 0, y });
    return cells;
  }, []);
  const squareByPosition = useMemo(() => new Map(squares.map(square => [square.position, square])), [squares]);

  useEffect(() => {
    let cancelled = false;
    if (targetPosition <= displayPosition) {
      setDisplayPosition(targetPosition);
      return;
    }
    const timer = window.setTimeout(() => {
      if (!cancelled) setDisplayPosition(value => Math.min(value + 1, targetPosition));
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [displayPosition, targetPosition]);

  useEffect(() => {
    if (!isLeader || !teamId) return;
    supabase.from("profiles").select("id, display_name, nickname, role").eq("team_id", teamId).in("role", ["team", "team_leader"]).then(({ data }) => setMembers((data ?? []) as Member[]));
  }, [isLeader, teamId, supabase]);

  useEffect(() => {
    const progressFilter = board.scope === "individual" ? `user_id=eq.${userId}` : teamId ? `team_id=eq.${teamId}` : undefined;
    const channel = supabase.channel(`game-board-${board.id}-${userId}`);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "game_progress", filter: progressFilter }, payload => {
      const next = Number((payload.new as any)?.position ?? 0);
      if (next >= 0) setTargetPosition(next);
    });
    channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "game_events" }, payload => {
      const row = payload.new as GameEvent;
      if ((board.scope === "individual" && row.user_id === userId) || (board.scope === "team" && row.team_id === teamId)) {
        setEvents(current => current.some(event => event.id === row.id) ? current : [...current, row]);
      }
    });
    channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_events" }, payload => {
      const row = payload.new as GameEvent;
      setEvents(current => current.map(event => event.id === row.id ? row : event));
    });
    channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_wallets", filter: board.scope === "individual" ? `user_id=eq.${userId}` : teamId ? `team_id=eq.${teamId}` : undefined }, payload => {
      setWallet(Number((payload.new as any)?.dracmas ?? 0));
    });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [board.id, board.scope, teamId, userId, supabase]);

  async function resolveEvent(event: GameEvent, optionIndex: number | null = null) {
    setBusyEvent(event.id);
    setNotice("");
    const beneficiary = event.choice_mode === "leader" ? beneficiaries[event.id] || null : null;
    const { error } = await supabase.rpc("resolve_game_event", {
      p_event_id: event.id,
      p_option_index: optionIndex,
      p_beneficiary_user_id: beneficiary,
    });
    if (error) setNotice(error.message || "Não foi possível resolver o prêmio.");
    else {
      setEvents(current => current.map(item => item.id === event.id ? { ...item, status: "resolved", selected_option_index: optionIndex, beneficiary_user_id: beneficiary } : item));
      setNotice("Prêmio registrado com sucesso! 🎉");
    }
    setBusyEvent(null);
  }

  return (
    <div className="space-y-6">
      <div className="gincana-card overflow-hidden">
        <div className="gincana-gradient p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-white/65">{board.scope === "individual" ? "Minha jornada" : "Jornada da equipe"}</p>
              <h1 className="mt-2 text-2xl font-extrabold tracking-[-.05em] sm:text-3xl">{board.name}</h1>
              <p className="mt-2 text-sm text-white/75">Casa {displayPosition} de {board.total_squares}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-right backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Dracmas</p>
              <p className="mt-1 text-2xl font-extrabold">🪙 {wallet}</p>
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-[#F7B538] transition-all duration-500" style={{ width: `${Math.round((displayPosition / board.total_squares) * 100)}%` }} />
          </div>
        </div>

        <div className="overflow-x-auto p-4 sm:p-6">
          <div className="gincana-board">
            <div className="gincana-board-center">
              <div className="px-10 text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#419D78]">GINCANA 2026</p>
                <p className="mt-2 text-2xl font-extrabold tracking-[-.05em] text-[#0C4767]">{board.scope === "individual" ? "JORNADA INDIVIDUAL" : "JORNADA DA EQUIPE"}</p>
                <p className="mt-2 text-xs text-[#63727b]">Chegue ao final. Desbloqueie recompensas.</p>
              </div>
            </div>
            {perimeter.map(cell => {
              const square = squareByPosition.get(cell.position);
              if (!square) return null;
              const tokens = players.filter(player => player.position === square.position);
              const x = (cell.x / 25) * 100;
              const y = (cell.y / 25) * 100;
              return (
                <div key={square.id} className="gincana-board-square" style={{ left: `${x}%`, top: `${y}%` }}>
                  <div className="gincana-board-square-inner" style={square.position !== 1 && square.position !== board.total_squares ? squareStyle(square.type) : undefined}>
                    <span className="text-[8px] font-extrabold opacity-70">{square.position}</span>
                    {square.type !== "normal" && <span className="text-[9px]">{square.type === "gold" ? "★" : square.type === "silver" ? "◆" : square.type === "bronze" ? "●" : "⚑"}</span>}
                    {tokens.map((player, index) => (
                      <div key={player.id} className={`gincana-board-token ${player.current ? "current" : ""}`} style={{ background: player.color, transform: `translate(calc(-50% + ${(index - (tokens.length - 1) / 2) * 18}px), calc(-50% + ${Math.abs(index - (tokens.length - 1) / 2) * 3}px))` }}>
                        <span className="gincana-board-token-dot" />
                        <span className="gincana-board-token-name">{player.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {notice && <div className="rounded-2xl border border-[#419D78]/20 bg-[#419D78]/10 px-4 py-3 text-sm font-semibold text-[#0C4767]">{notice}</div>}

      <section className="gincana-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#E63946]">Desbloqueios</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Casas especiais</h2>
          </div>
          <span className="rounded-full bg-[#F7B538]/15 px-3 py-1 text-xs font-extrabold text-[#0C4767]">{pendingEvents.length} pendente(s)</span>
        </div>

        <div className="mt-5 space-y-3">
          {pendingEvents.length === 0 && <p className="rounded-2xl border border-dashed border-[#0C4767]/15 p-5 text-sm text-[#63727b]">Nenhuma recompensa aguardando resolução.</p>}
          {pendingEvents.map(event => {
            const square = squareMap.get(event.square_id);
            const options = Array.isArray(event.reward_snapshot?.options) ? event.reward_snapshot.options : [];
            const directRewards = Array.isArray(event.reward_snapshot?.rewards) ? event.reward_snapshot.rewards : [];
            return (
              <article key={event.id} className="rounded-2xl border border-[#0C4767]/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#63727b]">{square ? palette[square.type].label : "CASA ESPECIAL"} · CASA {square?.position ?? "—"}</p>
                    <h3 className="mt-1 text-base font-extrabold text-[#0C4767]">{square?.title || "Prêmio desbloqueado"}</h3>
                    {square?.description && <p className="mt-1 text-xs leading-5 text-[#63727b]">{square.description}</p>}
                  </div>
                  {directRewards.length > 0 && <div className="rounded-xl bg-[#F7B538]/10 px-3 py-2 text-xs font-extrabold text-[#0C4767]">{rewardLabel(directRewards[0])}</div>}
                </div>

                {square?.type === "silver" ? (
                  <div className="mt-4 space-y-2">
                    {event.choice_mode === "leader" && (
                      <select value={beneficiaries[event.id] || ""} onChange={e => setBeneficiaries(current => ({ ...current, [event.id]: e.target.value }))} className="w-full rounded-xl border border-[#0C4767]/15 bg-white px-3 py-3 text-sm text-[#0C4767]">
                        <option value="">Escolha o beneficiário</option>
                        {members.map(member => <option key={member.id} value={member.id}>{member.nickname || member.display_name}</option>)}
                      </select>
                    )}
                    {options.map((option: any, index: number) => (
                      <button key={index} onClick={() => resolveEvent(event, index)} disabled={busyEvent === event.id || (event.choice_mode === "leader" && !beneficiaries[event.id])} className="w-full rounded-xl border border-[#AAB3B8]/40 bg-[#AAB3B8]/10 px-4 py-3 text-left text-sm font-extrabold text-[#24313a] transition hover:-translate-y-0.5 disabled:opacity-40">
                        {option.label || `Opção ${index + 1}`}
                        <span className="ml-2 text-xs font-semibold opacity-60">{Array.isArray(option.rewards) ? option.rewards.map((reward: any) => rewardLabel(reward)).join(" · ") : ""}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button onClick={() => resolveEvent(event)} disabled={busyEvent === event.id} className="mt-4 rounded-xl bg-[#0C4767] px-4 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:opacity-50">
                    {busyEvent === event.id ? "Registrando..." : "Resgatar prêmio 🎁"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
