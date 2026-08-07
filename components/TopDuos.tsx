import { Handshake } from 'lucide-react';

interface DuoRanking {
  aId: number;
  bId: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number;
}

interface PlayerOption {
  id: number;
  nom: string;
}

export default function TopDuos({
  duos,
  players,
  minMatches,
}: {
  duos: DuoRanking[];
  players: PlayerOption[];
  minMatches: number;
}) {
  if (duos.length === 0) return null;

  const nameMap = new Map(players.map(p => [p.id, p.nom]));

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 space-y-4">
      <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
        <Handshake size={18} className="text-red-600" />
        Meilleurs duos
        <span className="text-zinc-500 normal-case font-bold text-[10px] tracking-normal">
          (min. {minMatches} matchs ensemble)
        </span>
      </h2>

      <div className="divide-y divide-white/5">
        {duos.map((duo, idx) => {
          const nameA = nameMap.get(duo.aId) ?? `Joueur #${duo.aId}`;
          const nameB = nameMap.get(duo.bId) ?? `Joueur #${duo.bId}`;

          return (
            <div key={`${duo.aId}-${duo.bId}`} className="flex items-center gap-4 py-3 px-2">
              <span className={`w-6 shrink-0 text-center text-sm font-black italic ${
                idx === 0 ? 'text-red-600' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-orange-500' : 'text-zinc-500'
              }`}>
                {idx + 1}
              </span>

              <span className="flex-1 text-sm font-bold uppercase truncate">
                {nameA} <span className="text-zinc-500 normal-case">&amp;</span> {nameB}
              </span>

              <span className="hidden sm:block shrink-0 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {duo.wins}V · {duo.losses}D · {duo.draws}N
              </span>

              <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                duo.winrate >= 50 ? 'bg-green-500/10 text-green-500' : 'bg-red-600/10 text-red-500'
              }`}>
                {duo.winrate.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
