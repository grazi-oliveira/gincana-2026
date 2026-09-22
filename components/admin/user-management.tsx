"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Team = { id: string; name: string };
type Profile = {
  id: string;
  display_name: string;
  nickname: string | null;
  role: "pending" | "admin" | "team_leader" | "team";
  team_id: string | null;
};

const ROLE_LABELS: Record<Profile["role"], string> = {
  pending: "Pendente",
  admin: "Admin",
  team_leader: "Líder de equipe",
  team: "Participante",
};

function UserRow({ profile, teams, onSaved }: { profile: Profile; teams: Team[]; onSaved: (id: string, patch: Partial<Profile>) => void }) {
  const supabase = createClient();
  const [role, setRole] = useState<Profile["role"]>(profile.role);
  const [teamId, setTeamId] = useState(profile.team_id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const needsTeam = role !== "admin";

  async function save() {
    setMessage("");
    if (needsTeam && !teamId) { setMessage("Escolha uma equipe."); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ role, team_id: needsTeam ? teamId : null })
      .eq("id", profile.id);
    if (error) setMessage(error.message);
    else onSaved(profile.id, { role, team_id: needsTeam ? teamId : null });
    setSaving(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#0C4767]/10 p-4">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-[#0C4767]">{profile.nickname || profile.display_name}</p>
        <p className="text-[10px] text-[#63727b]">Atual: {ROLE_LABELS[profile.role]}</p>
      </div>
      <select value={role} onChange={e => setRole(e.target.value as Profile["role"])} className="field w-auto">
        <option value="pending">Pendente</option>
        <option value="team">Participante</option>
        <option value="team_leader">Líder de equipe</option>
        <option value="admin">Admin</option>
      </select>
      {needsTeam && (
        <select value={teamId} onChange={e => setTeamId(e.target.value)} className="field w-auto">
          <option value="">Selecione a equipe</option>
          {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
        </select>
      )}
      <button onClick={save} disabled={saving} className="rounded-xl bg-[#0C4767] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
      {message && <p className="w-full text-xs font-semibold text-[#E63946]">{message}</p>}
    </div>
  );
}

export default function UserManagement({ profiles: initialProfiles, teams }: { profiles: Profile[]; teams: Team[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);

  function handleSaved(id: string, patch: Partial<Profile>) {
    setProfiles(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  }

  const pending = profiles.filter(p => p.role === "pending");
  const assigned = profiles.filter(p => p.role !== "pending");

  return (
    <div className="space-y-6">
      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#E63946]">Aguardando atribuição</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-.04em] text-[#0C4767]">Usuários pendentes ({pending.length})</h1>
        <p className="mt-2 text-sm text-[#63727b]">Quem entra pela primeira vez fica aqui até você definir papel e equipe.</p>
        <div className="mt-5 space-y-3">
          {pending.length === 0 && <p className="text-sm text-[#63727b]">Ninguém pendente no momento.</p>}
          {pending.map(profile => (
            <UserRow key={profile.id} profile={profile} teams={teams} onSaved={handleSaved} />
          ))}
        </div>
      </section>

      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#419D78]">Todos os usuários</p>
        <h2 className="mt-1 text-xl font-extrabold text-[#0C4767]">Papéis e equipes ({assigned.length})</h2>
        <div className="mt-5 space-y-3">
          {assigned.length === 0 && <p className="text-sm text-[#63727b]">Nenhum usuário atribuído ainda.</p>}
          {assigned.map(profile => (
            <UserRow key={profile.id} profile={profile} teams={teams} onSaved={handleSaved} />
          ))}
        </div>
      </section>
    </div>
  );
}
