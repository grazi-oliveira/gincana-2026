"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Board = { id: string; scope: "individual" | "team"; name: string; total_squares: number; final_reward: Record<string, any> };
type Square = { id: string; board_id: string; position: number; type: "normal" | "gold" | "silver" | "bronze" | "final"; title: string | null; description: string | null; reward_config: Record<string, any>; choice_mode: "participant" | "leader" | "team" | null };

const types = [
  ["gold","🥇 Dourada — prêmio individual"],
  ["silver","🥈 Prata — escolha"],
  ["bronze","🥉 Bronze — prêmio da equipe"],
  ["final","🏁 Final"],
];

function defaultConfig(type: string) {
  if (type === "silver") return { options: [{ label: "30 dracmas", rewards: [{ type: "dracmas", amount: 30, target: "beneficiary" }] }, { label: "5 casas", rewards: [{ type: "movement", amount: 5, target: "beneficiary" }] }] };
  if (type === "bronze") return { rewards: [{ type: "dracmas", amount: 100, target: "team" }] };
  return { rewards: [{ type: "dracmas", amount: 30, target: "self" }] };
}

export default function GameConfig({ initialBoards, initialSquares }: { initialBoards: Board[]; initialSquares: Square[] }) {
  const supabase = createClient();
  const [boards, setBoards] = useState(initialBoards);
  const [squares, setSquares] = useState(initialSquares);
  const [selectedBoard, setSelectedBoard] = useState(initialBoards[0]?.id ?? "");
  const [position, setPosition] = useState("");
  const [type, setType] = useState("gold");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [choiceMode, setChoiceMode] = useState("participant");
  const [rewardJson, setRewardJson] = useState(JSON.stringify(defaultConfig("gold"), null, 2));
  const [message, setMessage] = useState("");

  const board = boards.find(item => item.id === selectedBoard);
  const boardSquares = squares.filter(square => square.board_id === selectedBoard).sort((a,b) => a.position-b.position);

  async function saveBoard() {
    if (!board) return;
    const total = Number((document.getElementById(`board-total-${board.id}`) as HTMLInputElement)?.value);
    if (!total || total < 1) return;
    const { data, error } = await supabase.from("game_boards").update({ total_squares: total, updated_at: new Date().toISOString() }).eq("id", board.id).select().single();
    if (error) setMessage(error.message);
    else { setBoards(current => current.map(item => item.id === board.id ? data : item)); setMessage("Tabuleiro atualizado."); }
  }

  async function addSquare() {
    setMessage("");
    const pos = Number(position);
    if (!board || !pos || pos > board.total_squares) { setMessage("Informe uma casa válida dentro do tabuleiro."); return; }
    let config: any;
    try { config = JSON.parse(rewardJson); } catch { setMessage("A configuração da recompensa precisa ser um JSON válido."); return; }
    const { data, error } = await supabase.from("game_squares").upsert({
      board_id: board.id,
      position: pos,
      type,
      title: title.trim() || null,
      description: description.trim() || null,
      reward_config: config,
      choice_mode: type === "silver" ? choiceMode : null,
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "board_id,position" }).select().single();
    if (error) setMessage(error.message);
    else {
      setSquares(current => [...current.filter(item => item.id !== data.id), data].sort((a,b) => a.position-b.position));
      setMessage(`Casa ${pos} configurada.`);
      setPosition(""); setTitle(""); setDescription("");
    }
  }

  async function removeSquare(square: Square) {
    const { error } = await supabase.from("game_squares").delete().eq("id", square.id);
    if (error) setMessage(error.message);
    else { setSquares(current => current.filter(item => item.id !== square.id)); setMessage(`Casa ${square.position} voltou a ser normal.`); }
  }

  return (
    <div className="space-y-6">
      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#419D78]">Configuração</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-.04em] text-[#0C4767]">Tabuleiros da Gincana</h1>
        <p className="mt-2 text-sm leading-6 text-[#63727b]">O ADM define o tamanho do tabuleiro e quais casas são especiais. Dracmas, movimento e pontuação são recompensas diferentes.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {boards.map(item => (
            <button key={item.id} onClick={() => setSelectedBoard(item.id)} className={`rounded-2xl border p-5 text-left transition ${selectedBoard === item.id ? "border-[#0C4767] bg-[#0C4767]/5" : "border-[#0C4767]/10 bg-white"}`}>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#63727b]">{item.scope === "individual" ? "Individual" : "Equipe"}</p>
              <p className="mt-1 text-lg font-extrabold text-[#0C4767]">{item.name}</p>
              <p className="mt-1 text-xs text-[#63727b]">{item.total_squares} casas</p>
            </button>
          ))}
        </div>
        {board && (
          <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl bg-[#F7B538]/10 p-4">
            <label className="flex-1 min-w-48"><span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-[#63727b]">Quantidade de casas</span><input id={`board-total-${board.id}`} defaultValue={board.total_squares} type="number" min="1" max="1000" className="w-full rounded-xl border border-[#0C4767]/10 bg-white px-3 py-3 text-sm font-bold text-[#0C4767]" /></label>
            <button onClick={saveBoard} className="rounded-xl bg-[#0C4767] px-4 py-3 text-xs font-extrabold text-white">Salvar tabuleiro</button>
          </div>
        )}
      </section>

      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#E63946]">Casas especiais</p>
        <h2 className="mt-1 text-xl font-extrabold text-[#0C4767]">Configurar uma casa</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label><span className="field-label">Casa</span><input value={position} onChange={e => setPosition(e.target.value)} type="number" min="1" max={board?.total_squares ?? 100} className="field" /></label>
          <label><span className="field-label">Tipo</span><select value={type} onChange={e => { setType(e.target.value); setRewardJson(JSON.stringify(defaultConfig(e.target.value), null, 2)); }} className="field">{types.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span className="field-label">Modo de escolha</span><select value={choiceMode} onChange={e => setChoiceMode(e.target.value)} disabled={type !== "silver"} className="field"><option value="participant">Participante</option><option value="leader">Líder escolhe</option><option value="team">Equipe escolhe</option></select></label>
          <label className="sm:col-span-2 lg:col-span-3"><span className="field-label">Título</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Prêmio especial" className="field" /></label>
          <label className="sm:col-span-2 lg:col-span-3"><span className="field-label">Descrição</span><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Explique o que foi desbloqueado." className="field" /></label>
          <label className="sm:col-span-2 lg:col-span-3"><span className="field-label">Recompensa</span><textarea value={rewardJson} onChange={e => setRewardJson(e.target.value)} rows={8} className="field font-mono text-xs" /></label>
        </div>
        <button onClick={addSquare} className="mt-4 rounded-xl bg-[#0C4767] px-5 py-3 text-xs font-extrabold text-white">Salvar casa especial</button>
        {message && <p className="mt-3 text-sm font-semibold text-[#0C4767]">{message}</p>}
      </section>

      <section className="gincana-card overflow-hidden">
        <div className="border-b border-[#0C4767]/8 p-6"><h2 className="text-xl font-extrabold text-[#0C4767]">Casas configuradas</h2></div>
        <div className="divide-y divide-[#0C4767]/7">
          {boardSquares.length === 0 && <p className="p-6 text-sm text-[#63727b]">Nenhuma casa especial configurada.</p>}
          {boardSquares.map(square => (
            <div key={square.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={squareStyle(square.type)}>{square.type === "gold" ? "🥇" : square.type === "silver" ? "🥈" : square.type === "bronze" ? "🥉" : "🏁"}</div>
              <div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-[#0C4767]">Casa {square.position} · {square.title || "Sem título"}</p><p className="mt-1 text-xs text-[#63727b]">{square.description || "Sem descrição"} {square.choice_mode ? `· ${square.choice_mode}` : ""}</p></div>
              <button onClick={() => removeSquare(square)} className="rounded-xl border border-[#E63946]/20 px-3 py-2 text-[10px] font-extrabold text-[#E63946]">Tornar normal</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function squareStyle(type: Square["type"]) {
  const colors: Record<string,string> = { gold:"#F7B538", silver:"#AAB3B8", bronze:"#B7794B", final:"#0C4767", normal:"#ffffff" };
  return { background: colors[type] || colors.normal };
}
