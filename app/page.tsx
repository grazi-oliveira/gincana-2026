"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    if (loading) return;
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
      return;
    }

    setLoading(false);
  }

  return (
    <main className="gincana-grid flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#F7B538]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#419D78]/20 blur-3xl" />

      <section className="relative w-full max-w-[460px]">
        <div className="gincana-gradient-warm mb-5 flex h-28 items-end justify-between overflow-hidden rounded-[30px] p-7 text-white gincana-shadow">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.24em]">GINCANA</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-[-.05em]">2026</h1>
          </div>
          <div className="text-5xl">🏆</div>
        </div>

        <div className="gincana-card p-7 sm:p-9">
          <p className="text-sm font-semibold text-[#419D78]">Sua jornada começa aqui</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#0C4767]">
            Entre para a Gincana
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#63727b]">
            Acesse com sua conta Google. Depois, seu perfil e sua equipe serão definidos pelo administrador.
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#0C4767] px-5 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#093b57] disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#0C4767]">G</span>
            {loading ? "Abrindo Google..." : "Continuar com Google"}
          </button>

          <div className="mt-6 flex items-center gap-2 text-[11px] font-medium text-[#63727b]">
            <span className="h-2 w-2 rounded-full bg-[#419D78]" />
            Acesso protegido por autenticação Google
          </div>
        </div>
      </section>
    </main>
  );
}
