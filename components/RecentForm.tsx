interface FormEntry {
  win: number | string;
  sc_p: number;
  sc_c: number;
}

// Pastilles V/D/N des N derniers matchs joués, du plus ancien (gauche) au plus récent (droite).
export default function RecentForm({ history, count = 5 }: { history: FormEntry[]; count?: number }) {
  const recent = history.slice(-count);
  if (recent.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Forme récente</span>
      <div className="flex items-center gap-1.5">
        {recent.map((m, i) => {
          const win = Number(m.win);
          const isWin = win === 1;
          const isDraw = win === 0;

          return (
            <div
              key={i}
              title={`${m.sc_p} - ${m.sc_c}`}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border ${
                isWin
                  ? 'bg-green-500/20 text-green-500 border-green-500/40'
                  : isDraw
                  ? 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40'
                  : 'bg-red-600/20 text-red-500 border-red-600/40'
              }`}
            >
              {isWin ? 'V' : isDraw ? 'N' : 'D'}
            </div>
          );
        })}
      </div>
    </div>
  );
}
