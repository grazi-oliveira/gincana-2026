export default function GameSummaryCard({ individualPosition, individualTotal, teamPosition, teamTotal, dracmas }: { individualPosition:number; individualTotal:number; teamPosition:number; teamTotal:number; dracmas:number }) {
  return (
    <a href="/game" className="ticket block p-6 transition hover:-translate-y-0.5">
      <div className="ticket-notch left" />
      <div className="ticket-notch right" />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Seu tabuleiro 🎲</h2>
        <span className="rounded-xl bg-[#F7B538]/15 px-3 py-2 text-lg font-bold text-[#0C4767]">🪙 {dracmas}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#0C4767]/5 p-4">
          <p className="text-xs text-[#63727b]">Sua jornada</p>
          <p className="mt-1 text-xl font-extrabold text-[#0C4767]">Casa {individualPosition}</p>
          <p className="text-xs text-[#63727b]">de {individualTotal}</p>
        </div>
        <div className="rounded-2xl bg-[#419D78]/10 p-4">
          <p className="text-xs text-[#63727b]">Jornada da equipe</p>
          <p className="mt-1 text-xl font-extrabold text-[#0C4767]">Casa {teamPosition}</p>
          <p className="text-xs text-[#63727b]">de {teamTotal}</p>
        </div>
      </div>
    </a>
  );
}
