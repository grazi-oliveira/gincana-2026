"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      alert(error.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 text-3xl">
            🏆
          </div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
            Gincana
          </p>
          <h1 className="text-4xl font-black tracking-tight">2026</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Entre com sua conta Google para acessar a plataforma.
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full rounded-2xl bg-white px-5 py-4 font-bold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
        >
          {loading ? "Abrindo Google..." : "Continuar com Google"}
        </button>

        <p className="mt-5 text-center text-xs leading-5 text-slate-400">
          Seu acesso será associado ao perfil e à equipe definidos pelo administrador.
        </p>
      </section>
    </main>
  );
}
