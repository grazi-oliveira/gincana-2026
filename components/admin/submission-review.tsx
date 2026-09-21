"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Submission = {
  id: string;
  text_content: string;
  submitted_at: string;
  task_id: string;
  user_id: string;
  taskTitle: string;
  userName: string;
  teamName: string;
};

export default function SubmissionReview({ initialSubmissions }: { initialSubmissions: Submission[] }) {
  const supabase = createClient();
  const [items,setItems]=useState(initialSubmissions);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");

  async function validate(id:string, approved:boolean) {
    setBusy(id); setMessage("");
    const { error } = await supabase.rpc("validate_submission",{p_submission_id:id,p_approved:approved});
    if (error) setMessage(error.message);
    else {
      setItems(current=>current.filter(item=>item.id!==id));
      setMessage(approved ? "Entrega aprovada. Pontos, dracmas e movimentos configurados foram processados. 🎉" : "Entrega recusada.");
    }
    setBusy(null);
  }

  return (
    <section className="gincana-card overflow-hidden">
      <div className="border-b border-[#0C4767]/8 p-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#E63946]">Validação</p>
        <h2 className="mt-1 text-xl font-extrabold text-[#0C4767]">Entregas aguardando ADM</h2>
      </div>
      {message && <div className="mx-6 mt-5 rounded-2xl bg-[#419D78]/10 px-4 py-3 text-sm font-semibold text-[#0C4767]">{message}</div>}
      <div className="divide-y divide-[#0C4767]/7">
        {items.length===0 && <p className="p-6 text-sm text-[#63727b]">Nenhuma entrega pendente. Tudo em dia. ✓</p>}
        {items.map(item=>(
          <article key={item.id} className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#63727b]">{item.teamName}</p>
                <h3 className="mt-1 text-base font-extrabold text-[#0C4767]">{item.taskTitle}</h3>
                <p className="mt-1 text-xs font-semibold text-[#419D78]">{item.userName}</p>
              </div>
              <p className="text-[10px] font-semibold text-[#63727b]">{new Date(item.submitted_at).toLocaleString("pt-BR")}</p>
            </div>
            <div className="mt-4 rounded-2xl bg-[#f7f8f5] p-4 text-sm leading-6 text-[#0C4767] whitespace-pre-wrap">{item.text_content}</div>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={()=>validate(item.id,false)} disabled={busy===item.id} className="rounded-xl border border-[#E63946]/20 px-4 py-3 text-xs font-extrabold text-[#E63946] disabled:opacity-50">Recusar</button>
              <button onClick={()=>validate(item.id,true)} disabled={busy===item.id} className="rounded-xl bg-[#419D78] px-4 py-3 text-xs font-extrabold text-white disabled:opacity-50">{busy===item.id ? "Processando..." : "Aprovar e pontuar ✓"}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
