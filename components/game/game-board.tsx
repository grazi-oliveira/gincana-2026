"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Board = { id: string; scope: "individual" | "team"; name: string; total_squares: number; final_reward: Record<string, unknown> };
type Square = { id: string; position: number; type: "normal" | "gold" | "silver" | "bronze" | "final"; title: string | null; description: string | null; reward_config: Record<string, any>; choice_mode: "participant" | "leader" | "team" | null };
type Progress = { position: number };
type GameEvent = { id: string; square_id: string; user_id: string | null; team_id: string | null; status: "pending" | "resolved" | "cancelled"; choice_mode: "participant" | "leader" | "team" | null; reward_snapshot: Record<string, any>; beneficiary_user_id: string | null; selected_option_index: number | null };
type Member = { id: string; display_name: string; nickname: string | null; role: string };\ntype Player = { id: string; name: string; position: number; color: string; current?: boolean };

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
  const perimeter = useMemo(() => {\n    const size = 26;\n    const cells: { position: number; x: number; y: number }[] = [];\n    for (let x = 0; x < size; x++) cells.push({ position: x + 1, x, y: 0 });\n    for (let y = 1; y < size; y++) cells.push({ position: 25 + y + 1, x: size - 1, y });\n    for (let x = size - 2; x >= 0; x--) cells.push({ position: 51 + (size - 1 - x), x, y: size - 1 });\n    for (let y = size - 2; y > 0; y--) cells.push({ position: 76 + (size - 1 - y), x: 0, y });\n    return cells;\n  }, []);\n  const squareByPosition = useMemo(() => new Map(squares.map(square => [square.position, square])), [squares]);        <div className="overflow-x-auto p-4 sm:p-6">\n          <div className="gincana-board">\n            <div className="gincana-board-center">\n              <div className="px-10 text-center">\n                <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#419D78]">GINCANA 2026</p>\n                <p className="mt-2 text-2xl font-extrabold tracking-[-.05em] text-[#0C4767]">{board.scope === "individual" ? "JORNADA INDIVIDUAL" : "JORNADA DA EQUIPE"}</p>\n                <p className="mt-2 text-xs text-[#63727b]">Chegue ao final. Desbloqueie recompensas.</p>\n              </div>\n            </div>\n            {perimeter.map(cell => {\n              const square = squareByPosition.get(cell.position);\n              if (!square) return null;\n              const tokens = players.filter(player => player.position === square.position);\n              const x = (cell.x / 25) * 100;\n              const y = (cell.y / 25) * 100;\n              return (\n                <div key={square.id} className="gincana-board-square" style={{ left: `${x}%`, top: `${y}%` }}>\n                  <div className="gincana-board-square-inner" style={square.position !== 1 && square.position !== board.total_squares ? squareStyle(square.type) : undefined}>\n                    <span className="text-[8px] font-extrabold opacity-70">{square.position}</span>\n                    {square.type !== "normal" && <span className="text-[9px]">{square.type === "gold" ? "★" : square.type === "silver" ? "◆" : square.type === "bronze" ? "●" : "⚑"}</span>}\n                    {tokens.map((player, index) => (\n                      <div key={player.id} className={`gincana-board-token ${player.current ? "current" : ""}`} style={{ background: player.color, transform: `translate(calc(-50% + ${(index - (tokens.length - 1) / 2) * 18}px), calc(-50% + ${Math.abs(index - (tokens.length - 1) / 2) * 3}px))` }}>\n                        <span className="gincana-board-token-dot" />\n                        <span className="gincana-board-token-name">{player.name}</span>\n                      </div>\n                    ))}\n                  </div>\n                </div>\n              );\n            })}\n          </div>\n        </div>
