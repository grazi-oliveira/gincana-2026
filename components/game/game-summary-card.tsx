export default function GameSummaryCard({ individualPosition, individualTotal, teamPosition, teamTotal, dracmas }: { individualPosition:number; individualTotal:number; teamPosition:number; teamTotal:number; dracmas:number }) {
  return (
    <a href="/game" className="gincana-card block p-6 transition hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#F7B538]">Jornada</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#0C4767]">Seu tabuleiro 🎲</h2>
        </div>
        <span className="rounded-xl bg-[#F7B538]/15 px-3 py-2 text-lg">🪙 {dracmas}</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#0C4767]/5 p-4">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#63727b]">Individual</p>
          <p className="mt-1 text-xl font-extrabold text-[#0C4767]">Casa {individualPosition}</p>
          <p className="text-[10px] text-[#63727b]">de {individualTotal}</p>
        </div>
        <div className="rounded-2xl bg-[#419D78]/10 p-4">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#63727b]">Equipe</p>
          <p className="mt-1 text-xl font-extrabold text-[#0C4767]">Casa {teamPosition}</p>
          <p className="text-[10px] text-[#63727b]">de {teamTotal}</p>
        </div>
      </div>
    </a>
  );
}
