"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Task = {
  id: string;
  title: string;
  description: string | null;
  frequency: "daily" | "weekly" | "monthly";
  due_at: string;
  personal_points: number;
  team_points: number;
  status: string;
  submission?: { id: string; text_content: string; status: string; submitted_at: string } | null;
};

const frequencyLabel = { daily: "Hoje", weekly: "Esta semana", monthly: "Este mês" };

function dueLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(taskId: string) {
    if (!text.trim()) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setMessage("Sua sessão expirou. Entre novamente.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("task_submissions")
      .insert({
        task_id: taskId,
        user_id: userData.user.id,
        text_content: text.trim(),
        status: "submitted",
      })
      .select("id, text_content, status, submitted_at")
      .single();

    if (error) {
      setMessage(error.message.includes("row-level security")
        ? "Essa tarefa não está mais disponível para envio."
        : "Não foi possível enviar agora. Tente novamente.");
    } else if (data) {
      setTasks(current => current.map(task => task.id === taskId ? { ...task, submission: data } : task));
      setText("");
      setOpenId(null);
      setMessage("Entrega enviada para validação. Sem penalidade enquanto aguarda a validação.");
    }
    setSaving(false);
  }

  if (!tasks.length) {
    return (
      <div className="gincana-card p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7B538]/20 text-2xl">✓</div>
        <h2 className="mt-4 text-lg font-extrabold text-[#0C4767]">Tudo tranquilo por aqui</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#63727b]">
          Nenhuma tarefa foi atribuída a você neste momento. Quando uma nova tarefa for criada, ela aparecerá aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-2xl border border-[#419D78]/20 bg-[#419D78]/10 px-4 py-3 text-sm font-semibold text-[#0C4767]">
          {message}
        </div>
      )}

      {tasks.map(task => {
        const submitted = !!task.submission;
        const isOpen = openId === task.id;
        return (
          <article key={task.id} className="gincana-card overflow-hidden">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#0C4767]/8 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#0C4767]">
                      {frequencyLabel[task.frequency]}
                    </span>
                    {submitted && (
                      <span className="rounded-full bg-[#419D78]/12 px-3 py-1 text-[10px] font-extrabold text-[#419D78]">
                        Enviada para validação
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-extrabold tracking-[-.035em] text-[#0C4767]">{task.title}</h2>
                  {task.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#63727b]">{task.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-2xl bg-[#F7B538]/12 px-4 py-3">
                    <p className="text-lg font-extrabold text-[#0C4767]">+{task.personal_points}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#63727b]">pessoal</p>
                  </div>
                  <div className="rounded-2xl bg-[#419D78]/10 px-4 py-3">
                    <p className="text-lg font-extrabold text-[#0C4767]">+{task.team_points}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#63727b]">equipe</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#0C4767]/8 pt-4">
                <p className="text-xs font-semibold text-[#63727b]">
                  Prazo: <span className="text-[#0C4767]">{dueLabel(task.due_at)}</span>
                </p>

                {!submitted && new Date(task.due_at) >= new Date() && (
                  <button
                    onClick={() => { setOpenId(isOpen ? null : task.id); setMessage(""); }}
                    className="rounded-xl bg-[#0C4767] px-4 py-2.5 text-xs font-extrabold text-white transition hover:-translate-y-0.5"
                  >
                    {isOpen ? "Fechar entrega" : "Enviar resposta"}
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="mt-5 rounded-2xl bg-[#0C4767]/5 p-4">
                  <label className="text-xs font-extrabold text-[#0C4767]">Sua entrega</label>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    maxLength={3000}
                    rows={5}
                    placeholder="Escreva aqui a resposta da tarefa..."
                    className="mt-3 w-full resize-none rounded-xl border border-[#0C4767]/12 bg-white px-4 py-3 text-sm outline-none placeholder:text-[#63727b]/60 focus:border-[#419D78]"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-[#63727b]">{text.length}/3000</span>
                    <button
                      disabled={saving || !text.trim()}
                      onClick={() => submit(task.id)}
                      className="rounded-xl bg-[#419D78] px-5 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Enviando..." : "Enviar para validação"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
