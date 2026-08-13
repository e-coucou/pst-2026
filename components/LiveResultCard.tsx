'use client';

import FavoriStar from '@/components/FavoriStar';
import MatchPredictionButton from '@/components/MatchPredictionButton';

// Carte résultat en lecture seule (palmarès) : équipe 1 / score / équipe 2, empilés
// pointeur/tireur, bouton "brain a posteriori". Unifie les 3 blocs quasi identiques du podium
// (finales / demis / détail des poules), qui avaient légèrement divergé en padding sans raison
// visible (p-5/p-2/p-3) — cf. documents/todo.md.

type Team = { id: string; pointeur_id: number; tireur_id: number } | undefined;

export interface LiveResultCardProps {
  match: { id: number; score_team1: number | null; score_team2: number | null };
  team1: Team;
  team2: Team;
  playersMap: Record<number, string>;
  favoriId: number | null;
  label?: string;
}

export default function LiveResultCard({ match, team1, team2, playersMap, favoriId, label }: LiveResultCardProps) {
  const renderTeam = (team: Team, align: 'right' | 'left') => (
    <div className={`flex flex-col flex-1 truncate ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <span className="truncate text-purple-400">{playersMap[team?.pointeur_id ?? -1]?.split(' ')[0]} <FavoriStar active={team?.pointeur_id === favoriId} /></span>
      <span className="truncate text-orange-400">{playersMap[team?.tireur_id ?? -1]?.split(' ')[0]} <FavoriStar active={team?.tireur_id === favoriId} /></span>
    </div>
  );

  return (
    <div className="bg-zinc-900/30 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-3">
      {label && <span className="text-sm font-black text-red-600 uppercase tracking-widest">{label}</span>}
      <div className="flex items-center justify-between w-full font-bold uppercase text-sm md:text-md">
        {renderTeam(team1, 'right')}
        <div className="shrink-0 mx-4 flex flex-col items-center gap-1.5">
          <div className="bg-black px-4 py-2 rounded-xl font-black text-xl border border-white/5 text-white text-center">
            {match.score_team1} - {match.score_team2}
          </div>
          <MatchPredictionButton
            gameId={match.id}
            mode="live"
            className="p-1.5 rounded-full bg-zinc-800 text-zinc-500 hover:bg-emerald-500/20 hover:text-emerald-500 transition-colors"
          />
        </div>
        {renderTeam(team2, 'left')}
      </div>
    </div>
  );
}
