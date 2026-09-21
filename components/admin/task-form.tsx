"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Team = { id: string; name: string };
type Profile = { id: string; display_name: string; nickname: string | null; team_id: string | null; role: string };

export default function TaskForm({ role, currentTeamId, teams, profiles }: { role: string; currentTeamId: string | null; teams: Team[]; profiles: Profile[] }) {
  const supabase = createClient();
  const [title,setTitle]=useState("");
  const [description,setDescription]=useState("");
  const [frequency,setFrequency]=useState("daily");
  const [teamId,setTeamId]=useState(currentTeamId || teams[0]?.id || "");
  const [assignment,setAssignment]=useState("team");
  const [assignedTo,setAssignedTo]=useState("");
  const [dueAt,setDueAt]=useState("");
  const [personalPoints,setPersonalPoints]=useState("0");
  const [teamPoints,setTeamPoints]=useState("0");
  const [personalPenalty,setPersonalPenalty]=useState("0");
  const [teamPenalty,setTeamPenalty]=useState("0");
  const [personalDracmas,setPersonalDracmas]=useState("0");
  const [teamDracmas,setTeamDracmas]=useState("0");
  const [personalMovement,setPersonalMovement]=useState("0");
  const [teamMovement,setTeamMovement]=useState("0");
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  const availableProfiles = profiles.filter(profile => profile.team_id === teamId && ["team","team_leader"].includes(profile.role));

  async function createTask() {
    setMessage("");
    if (!title.trim() || !teamId || !dueAt) { setMessage("Preencha título, equipe e prazo."); return; }
    setSaving(true);
    const selectedUsers = assignment === "person" ? [assignedTo] : availableProfiles.map(profile => profile.id);
    if (!selectedUsers.length || selectedUsers.some(Boolean) === false) { setMessage("Não há participantes disponíveis para essa equipe."); setSaving(false); return; }

    const payload = selectedUsers.filter(Boolean).map(userId => ({
      title: title.trim(),
      description: description.trim() || null,
      frequency,
      assigned_to: userId,
      team_id: teamId,
      due_at: new Date(dueAt).toISOString(),
      personal_points: Number(personalPoints) || 0,
      team_points: Number(teamPoints) || 0,
      personal_penalty: Number(personalPenalty) || 0,
      team_penalty: Number(teamPenalty) || 0,
      personal_dracmas: Number(personalDracmas) || 0,
      team_dracmas: Number(teamDracmas) || 0,
      personal_movement: Number(personalMovement) || 0,
      team_movement: Number(teamMovement) || 0,
      status: "active",
    }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("Sua sessão expirou."); setSaving(false); return; }

    const { error } = await supabase.from("tasks").insert(payload.map(item => ({ ...item, created_by: user.id })));
    if (error) setMessage(error.message);
    else {
      setMessage(`Tarefa criada para ${payload.length} participante(s). 🎯`);
      setTitle(""); setDescription(""); setAssignedTo("");
    }
    setSaving(false);
  }

  const field = "field";
  return (
    <div className="space-y-6">
      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#419D78]">Novo desafio</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-.04em] text-[#0C4767]">Criar tarefa</h1>
        <p className="mt-2 text-sm leading-6 text-[#63727b]">Uma tarefa pode entregar pontos, dracmas e/ou movimento. Essas recompensas são independentes.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="field-label">Título</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: Desafio do versículo" className={field}/></label>
          <label className="md:col-span-2"><span className="field-label">Descrição</span><textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className={field}/></label>
          <label><span className="field-label">Frequência</span><select value={frequency} onChange={e=>setFrequency(e.target.value)} className={field}><option value="daily">Diária</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></label>
          <label><span className="field-label">Prazo</span><input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)} className={field}/></label>

          <label><span className="field-label">Equipe</span><select value={teamId} onChange={e=>{setTeamId(e.target.value);setAssignedTo("");}} disabled={role==="team_leader"} className={field}>{teams.filter(team=>role==="admin"||team.id===currentTeamId).map(team=><option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <label><span className="field-label">Aplicar para</span><select value={assignment} onChange={e=>setAssignment(e.target.value)} className={field}><option value="team">Toda a equipe</option><option value="person">Uma pessoa</option></select></label>

          {assignment === "person" && <label className="md:col-span-2"><span className="field-label">Responsável</span><select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} className={field}><option value="">Selecione</option>{availableProfiles.map(profile=><option key={profile.id} value={profile.id}>{profile.nickname || profile.display_name}</option>)}</select></label>}
        </div>
      </section>

      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#F7B538]">Recompensas</p>
        <h2 className="mt-1 text-xl font-extrabold text-[#0C4767]">O que essa tarefa entrega?</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className="field-label">Pontos pessoais</span><input type="number" min="0" value={personalPoints} onChange={e=>setPersonalPoints(e.target.value)} className={field}/></label>
          <label><span className="field-label">Pontos equipe</span><input type="number" min="0" value={teamPoints} onChange={e=>setTeamPoints(e.target.value)} className={field}/></label>
          <label><span className="field-label">🪙 Dracmas pessoais</span><input type="number" min="0" value={personalDracmas} onChange={e=>setPersonalDracmas(e.target.value)} className={field}/></label>
          <label><span className="field-label">🪙 Dracmas equipe</span><input type="number" min="0" value={teamDracmas} onChange={e=>setTeamDracmas(e.target.value)} className={field}/></label>
          <label><span className="field-label">🎲 Movimento pessoal</span><input type="number" min="0" value={personalMovement} onChange={e=>setPersonalMovement(e.target.value)} className={field}/></label>
          <label><span className="field-label">🎲 Movimento equipe</span><input type="number" min="0" value={teamMovement} onChange={e=>setTeamMovement(e.target.value)} className={field}/></label>
        </div>
      </section>

      <section className="gincana-card p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#E63946]">Penalidades</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className="field-label">Penalidade pessoal</span><input type="number" min="0" value={personalPenalty} onChange={e=>setPersonalPenalty(e.target.value)} className={field}/></label>
          <label><span className="field-label">Penalidade equipe</span><input type="number" min="0" value={teamPenalty} onChange={e=>setTeamPenalty(e.target.value)} className={field}/></label>
        </div>
        <button onClick={createTask} disabled={saving} className="mt-6 rounded-xl bg-[#0C4767] px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50">{saving ? "Criando..." : "Criar tarefa 🚀"}</button>
        {message && <p className="mt-3 text-sm font-semibold text-[#0C4767]">{message}</p>}
      </section>
    </div>
  );
}
