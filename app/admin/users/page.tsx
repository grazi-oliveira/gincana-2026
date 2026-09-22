import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserManagement from "@/components/admin/user-management";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const [{ data: teams }, { data: profiles }] = await Promise.all([
    supabase.from("teams").select("id,name").order("name"),
    supabase.from("profiles").select("id,display_name,nickname,role,team_id").order("created_at", { ascending: true }),
  ]);

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1000px] p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#419D78]">ADM · GINCANA 2026</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">Usuários</h1>
          </div>
          <a href="/admin" className="rounded-xl bg-[#0C4767] px-4 py-3 text-xs font-extrabold text-white">Voltar</a>
        </div>
        <UserManagement profiles={(profiles ?? []) as any} teams={(teams ?? []) as any} />
      </div>
    </main>
  );
}
