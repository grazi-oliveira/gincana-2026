"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Team = { id: string; name: string; color: string | null; emoji: string | null };

const DEFAULT_COLOR = "#0C4767";

export default function TeamForm({ teams: initialTeams }: { teams: Team[] }) {
  const supabase = createClient();
  const [teams, setTeams] = useState(initialTeams);
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [emoji, setEmoji] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  async function createTeam() {
    setMessage("");
    if (!name.trim()) { setMessage("Dê um nome para a equipe."); return; }
    setCreating(true);
    const { data, error } = await supabase
      .from("teams")
      .insert({ name: name.trim(), color, emoji: emoji.trim() || null })
      .select("id,name,color,emoji")
      .single();
    if (error) {
      setMessage(error.message);
    } else if (data) {
      setTeams(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName(""); setColor(DEFAULT_COLOR); setEmoji("");
      setMessage("Equipe criada. 🎉");
    }
    setCreating(false);
  }

  async function updateTeam(team: Team) {
    setSavingId(team.id);
    setMessage("");
    const { error } = await supabase
      .from("teams")
      .update({ name: team.name, color: team.color, emoji: team.emoji })
      .eq("id", team.id);
    if (error) setMessage(error.message);
    setSavingId(null);
  }

  function patchTeam(id: string, patch: Partial<Team>) {
    setTeams(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }

  return (
    <div className="space-y-6">
      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#419D78]">Nova equipe</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-.04em] text-[#0C4767]">Criar equipe</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <label><span className="field-label">Nome</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Leões de Judá" className="field" /></label>
          <label><span className="field-label">Cor</span><input type="color" value={color} onChange={e => setColor(e.target.value)} className="field h-[46px] p-1" /></label>
          <label><span className="field-label">Emoji</span><input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🦁" maxLength={4} className="field" /></label>
          <button onClick={createTeam} disabled={creating} className="h-[46px] rounded-xl bg-[#0C4767] px-5 text-sm font-extrabold text-white disabled:opacity-50">{creating ? "Criando..." : "Criar"}</button>
        </div>
        {message && <p className="mt-3 text-sm font-semibold text-[#0C4767]">{message}</p>}
      </section>

      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#F7B538]">Equipes cadastradas</p>
        <h2 className="mt-1 text-xl font-extrabold text-[#0C4767]">{teams.length} equipe(s)</h2>
        {teams.length === 0 && <p className="mt-4 text-sm text-[#63727b]">Nenhuma equipe cadastrada ainda.</p>}
        <div className="mt-5 space-y-3">
          {teams.map(team => (
            <div key={team.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#0C4767]/10 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: `${team.color ?? DEFAULT_COLOR}22` }}>{team.emoji || "◆"}</span>
              <input value={team.name} onChange={e => patchTeam(team.id, { name: e.target.value })} className="field min-w-0 flex-1" />
              <input type="color" value={team.color ?? DEFAULT_COLOR} onChange={e => patchTeam(team.id, { color: e.target.value })} className="field h-[46px] w-16 p-1" />
              <input value={team.emoji ?? ""} onChange={e => patchTeam(team.id, { emoji: e.target.value })} maxLength={4} className="field w-20" />
              <button onClick={() => updateTeam(team)} disabled={savingId === team.id} className="rounded-xl bg-[#419D78] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">{savingId === team.id ? "Salvando..." : "Salvar"}</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
