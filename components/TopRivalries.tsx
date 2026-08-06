import Link from 'next/link';
import { Flame } from 'lucide-react';

interface PairRanking {
  aId: number;
  bId: number;
  matches: number;
}

interface PlayerOption {
  id: number;
  nom: string;
}

export default function TopRivalries({
  pairs,
  players,
}: {
  pairs: PairRanking[];
  players: PlayerOption[];
}) {
  if (pairs.length === 0) return null;

  const nameMap = new Map(players.map(p => [p.id, p.nom]));
  const topMatches = pairs[0].matches;

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 space-y-4">
      <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
        <Flame size={18} className="text-red-600" />
        Duels les plus fréquents
      </h2>

      <div className="divide-y divide-white/5">
        {pairs.map((pair, idx) => {
          const nameA = nameMap.get(pair.aId) ?? `Joueur #${pair.aId}`;
          const nameB = nameMap.get(pair.bId) ?? `Joueur #${pair.bId}`;
          const isTop = pair.matches === topMatches;

          return (
            <Link
              key={`${pair.aId}-${pair.bId}`}
              href={`/joueurs/face-a-face?a=${pair.aId}&b=${pair.bId}`}
              className="flex items-center gap-4 py-3 px-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <span className={`w-6 shrink-0 text-center text-sm font-black italic ${
                idx === 0 ? 'text-red-600' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-orange-500' : 'text-zinc-500'
              }`}>
                {idx + 1}
              </span>

              <span className="flex-1 text-sm font-bold uppercase truncate group-hover:text-red-500 transition-colors">
                {nameA} <span className="text-zinc-500 normal-case">vs</span> {nameB}
              </span>

              <span className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                isTop ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {pair.matches} match{pair.matches > 1 ? 's' : ''}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
