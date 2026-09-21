import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: notifications } = await supabase
    .from("game_event_notifications")
    .select("id,event_id,read_at,created_at")
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const eventIds = (notifications ?? []).map(item => item.event_id);
  const { data: events } = eventIds.length
    ? await supabase.from("game_events").select("id,square_id,status,triggered_at,reward_snapshot").in("id", eventIds)
    : { data: [] as any[] };
  const squareIds = (events ?? []).map(item => item.square_id);
  const { data: squares } = squareIds.length
    ? await supabase.from("game_squares").select("id,position,type,title,description").in("id", squareIds)
    : { data: [] as any[] };

  const eventMap = new Map((events ?? []).map(event => [event.id, event]));
  const squareMap = new Map((squares ?? []).map(square => [square.id, square]));

  return (
    <main className="gincana-grid min-h-screen bg-[#f7f8f5]">
      <div className="mx-auto max-w-[900px] p-5 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#E63946]">GINCANA 2026</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-.05em] text-[#0C4767]">Notificações 🔔</h1>
          </div>
          <a href="/game" className="rounded-xl bg-[#0C4767] px-4 py-3 text-xs font-extrabold text-white">Ver jornada</a>
        </div>

        <div className="space-y-3">
          {(notifications ?? []).length === 0 && (
            <div className="gincana-card p-8 text-center text-sm text-[#63727b]">Nenhuma notificação ainda.</div>
          )}
          {(notifications ?? []).map(notification => {
            const event = eventMap.get(notification.event_id);
            const square = event ? squareMap.get(event.square_id) : null;
            return (
              <article key={notification.id} className={`gincana-card p-5 ${notification.read_at ? "" : "ring-2 ring-[#F7B538]/30"}`}>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F7B538]/15 text-xl">{square?.type === "gold" ? "🥇" : square?.type === "silver" ? "🥈" : square?.type === "bronze" ? "🥉" : "🔔"}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#63727b]">{square ? `Casa ${square.position}` : "Evento especial"}</p>
                    <h2 className="mt-1 text-base font-extrabold text-[#0C4767]">{square?.title || "Uma casa especial foi desbloqueada"}</h2>
                    <p className="mt-1 text-xs leading-5 text-[#63727b]">{square?.description || "Há uma recompensa aguardando resolução na sua jornada."}</p>
                    <p className="mt-3 text-[10px] font-semibold text-[#63727b]">{event?.status === "resolved" ? "Resolvido" : "Aguardando ação"}</p>
                  </div>
                  <a href="/game" className="rounded-xl border border-[#0C4767]/10 px-3 py-2 text-[10px] font-extrabold text-[#0C4767]">Abrir</a>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
