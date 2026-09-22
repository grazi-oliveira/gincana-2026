"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NicknamePrompt({ suggestedName }: { suggestedName: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    if (!nickname.trim()) { setError("Digite como você quer ser chamado."); return; }
    setSaving(true);
    const { error: rpcError } = await supabase.rpc("update_my_profile", { p_nickname: nickname.trim() });
    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }
    router.refresh();
  }

  return (
    <main className="gincana-grid flex min-h-screen items-center justify-center px-5 py-10">
      <section className="gincana-card w-full max-w-[440px] p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#419D78]/15 text-3xl">👋</div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-[-.04em] text-[#0C4767]">Como você gostaria de ser chamado?</h1>
        <p className="mt-3 text-sm leading-6 text-[#63727b]">
          Esse é o nome que vai aparecer no seu painel, no ranking e para o resto da equipe — não precisa ser o mesmo do seu e-mail.
        </p>
        <input
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          onKeyDown={e => e.key === "Enter" && save()}
          placeholder={suggestedName || "Seu apelido"}
          maxLength={40}
          autoFocus
          className="field mt-6 text-center text-base"
        />
        {error && <p className="mt-3 text-xs font-semibold text-[#E63946]">{error}</p>}
        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full rounded-2xl bg-[#0C4767] px-5 py-3.5 text-sm font-extrabold text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Continuar"}
        </button>
      </section>
    </main>
  );
}
