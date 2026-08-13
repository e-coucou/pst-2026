'use client';

import { Brain, Save, Loader2, Edit2 } from 'lucide-react';
import FavoriStar from '@/components/FavoriStar';
import MatchPredictionButton from '@/components/MatchPredictionButton';

// Carte match éditable partagée par poules/demi/finale/ronde (saisie de score, déblocage,
// bouton prédiction). Unifie 4 versions quasi identiques qui avaient légèrement divergé au fil
// des sessions (couleur du bouton "Enregistrer" tantôt violette tantôt rouge sans raison liée au
// contexte, animation au survol présente ou non) — cf. documents/todo.md. `accentColor` reste la
// seule vraie variation intentionnelle : orange/violet pour distinguer les poules Gassin/Ramatuelle,
// rouge pour les phases à élimination directe (demi/finale/ronde) où il n'y a qu'un seul tableau.

type Team = { id: string; pointeur_id: number; tireur_id: number } | undefined;

const ACCENT = {
  orange: { finishedBg: 'bg-orange-600/20 border-orange-600/50', saveBg: 'bg-orange-500 active:bg-orange-700' },
  purple: { finishedBg: 'bg-purple-600/20 border-purple-500/50', saveBg: 'bg-purple-500 active:bg-purple-700' },
  red: { finishedBg: 'bg-red-600/10 border-red-600/30', saveBg: 'bg-red-600 active:bg-red-800' },
} as const;

export interface LiveMatchCardProps {
  match: { id: number; team1_id: string; team2_id: string; terrain?: string | null; status: string; score_team1?: number | null; score_team2?: number | null };
  team1: Team;
  team2: Team;
  playersMap: Record<number, string>;
  favoriId: number | null;
  accentColor: keyof typeof ACCENT;
  size?: 'default' | 'large'; // 'large' = texte agrandi pour les finales
  centerLabel?: string; // libellé affiché au-dessus du score (ex: "Petite Finale")
  editable?: boolean; // false = score figé sans bouton d'action (ex: rondes précédentes)
  score?: { s1: number | ''; s2: number | '' };
  onScoreChange?: (team: 1 | 2, value: string) => void;
  saving?: boolean;
  onSave?: () => void;
  onUnlock?: () => void;
  onPredict?: () => void;
}

export default function LiveMatchCard({
  match, team1, team2, playersMap, favoriId, accentColor,
  size = 'default', centerLabel, editable = true,
  score, onScoreChange, saving, onSave, onUnlock, onPredict,
}: LiveMatchCardProps) {
  const isTermine = match.status === 'TERMINE';
  const s = score || { s1: '', s2: '' };
  const accent = ACCENT[accentColor];
  const large = size === 'large';

  const renderTeam = (team: Team, align: 'right' | 'left') => (
    <div className={`flex-1 min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <div className={large ? 'text-sm text-red-500 font-black' : 'text-[10px] text-zinc-500 font-black'}>
        #{align === 'right' ? match.team1_id : match.team2_id}
      </div>
      <div className={`${large ? 'text-xs md:text-lg' : 'text-[11px] md:text-[14px]'} font-bold uppercase truncate leading-tight`}>
        <span className="text-purple-500">{playersMap[team?.pointeur_id ?? -1] || team?.pointeur_id} <FavoriStar active={team?.pointeur_id === favoriId} /></span><br className="md:hidden" />
        <span className="hidden md:inline"> & </span>
        <span className="text-orange-500">{playersMap[team?.tireur_id ?? -1] || team?.tireur_id} <FavoriStar active={team?.tireur_id === favoriId} /></span>
      </div>
    </div>
  );

  const scoreBlock = editable ? (
    <div className="flex flex-col items-center gap-1">
      {match.terrain && <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{match.terrain}</span>}
      {centerLabel && <span className="text-sm text-zinc-500">{centerLabel}</span>}
      <div className="flex items-center gap-1 md:gap-2 bg-zinc-900 p-1 md:p-2 rounded-lg md:rounded-xl">
        <input
          type="number" inputMode="numeric" value={s.s1}
          onChange={(e) => onScoreChange?.(1, e.target.value)}
          disabled={isTermine}
          className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none"
        />
        <span className="text-zinc-400 font-bold">-</span>
        <input
          type="number" inputMode="numeric" value={s.s2}
          onChange={(e) => onScoreChange?.(2, e.target.value)}
          disabled={isTermine}
          className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none"
        />
      </div>
    </div>
  ) : (
    <div className="shrink-0 bg-zinc-900 px-4 py-2 rounded-xl font-black text-lg border border-white/5 text-white text-center">
      {match.score_team1} - {match.score_team2}
    </div>
  );

  return (
    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl border ${isTermine ? accent.finishedBg : 'bg-black border-white/10'} flex items-center justify-between gap-2 md:gap-4`}>
      {renderTeam(team1, 'right')}
      {scoreBlock}
      {renderTeam(team2, 'left')}
      {editable && (
        <>
          <div className="flex shrink-0 group">
            {!isTermine && (
              <button onClick={onPredict} className="mb-0 flex flex-col items-center gap-1 transition-all">
                <div className="p-1.5 bg-zinc-800 rounded-full transition-colors group-hover:bg-red-500 group-hover:scale-[1.3]">
                  <Brain size={20} className="text-zinc-500 group-hover:text-white md:h-6" />
                </div>
              </button>
            )}
            {isTermine && (
              <MatchPredictionButton
                gameId={match.id}
                mode="live"
                className="p-1.5 bg-zinc-800 rounded-full text-zinc-500 transition-colors hover:bg-emerald-500 hover:text-white hover:scale-[1.3]"
              />
            )}
          </div>
          <div className="flex shrink-0 group">
            {isTermine ? (
              <button onClick={onUnlock} disabled={saving} aria-label="Déverrouiller le match pour modification" className="text-red-500 p-1 hover:text-white transition-colors group-hover:scale-[1.3] disabled:opacity-40">
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Edit2 size={20} className="md:w-6 md:h-6" />}
              </button>
            ) : (
              <button onClick={onSave} disabled={saving} className={`p-2 rounded-lg text-white transition-all group-hover:scale-[1.3] ${accent.saveBg}`}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
