'use client';

import { useMemo, useState } from 'react';
import ShareMatchButton from '@/components/ShareMatchButton';

interface TeamRef {
  tireurId: number | null;
  tireurNom: string;
  pointeurId: number | null;
  pointeurNom: string;
}

interface Match {
  id: number;
  year: number;
  type: string;
  poule: string | null;
  score1: number;
  score2: number;
  team1: TeamRef;
  team2: TeamRef;
}

interface PlayerOption {
  id: number;
  nom: string;
}

type GapFilter = 'all' | 'serre' | 'moyen' | 'large' | 'fanny';

const GAP_LABELS: Record<GapFilter, string> = {
  all: 'Tous les écarts',
  serre: 'Serré (1-3)',
  moyen: 'Moyen (4-9)',
  large: 'Large (10-12)',
  fanny: 'Fanny (13-0)',
};

function matchesGapFilter(gap: number, filter: GapFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'serre') return gap >= 1 && gap <= 3;
  if (filter === 'moyen') return gap >= 4 && gap <= 9;
  if (filter === 'large') return gap >= 10 && gap <= 12;
  return gap === 13;
}

const PAGE_SIZE = 30;

export default function MatchSearch({
  matches,
  players,
  years,
  types,
}: {
  matches: Match[];
  players: PlayerOption[];
  years: number[];
  types: string[];
}) {
  const [playerId, setPlayerId] = useState<number | ''>('');
  const [year, setYear] = useState<number | ''>('');
  const [type, setType] = useState<string>('');
  const [gap, setGap] = useState<GapFilter>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    return matches.filter(m => {
      if (year !== '' && m.year !== year) return false;
      if (type !== '' && m.type !== type) return false;

      const scoreGap = Math.abs(m.score1 - m.score2);
      if (!matchesGapFilter(scoreGap, gap)) return false;

      if (playerId !== '') {
        const ids = [m.team1.tireurId, m.team1.pointeurId, m.team2.tireurId, m.team2.pointeurId];
        if (!ids.includes(playerId)) return false;
      }

      return true;
    });
  }, [matches, playerId, year, type, gap]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visible.length;

  const resetAndFilter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="space-y-6">
      {/* BARRE DE FILTRES */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select
          value={playerId}
          onChange={e => resetAndFilter(setPlayerId)(e.target.value ? Number(e.target.value) : '')}
          className="bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase text-white focus:outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Tous les joueurs</option>
          {players.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>

        <select
          value={year}
          onChange={e => resetAndFilter(setYear)(e.target.value ? Number(e.target.value) : '')}
          className="bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase text-white focus:outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Toutes les saisons</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={type}
          onChange={e => resetAndFilter(setType)(e.target.value)}
          className="bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase text-white focus:outline-none focus:border-red-600 transition-colors"
        >
          <option value="">Tous les types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={gap}
          onChange={e => resetAndFilter(setGap)(e.target.value as GapFilter)}
          className="bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold uppercase text-white focus:outline-none focus:border-red-600 transition-colors"
        >
          {(Object.keys(GAP_LABELS) as GapFilter[]).map(g => (
            <option key={g} value={g}>{GAP_LABELS[g]}</option>
          ))}
        </select>
      </div>

      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
        {filtered.length} match{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
      </p>

      {/* RÉSULTATS */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-zinc-400 font-black uppercase tracking-widest">
          Aucun match ne correspond à ces critères.
        </div>
      ) : (
        <>
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {visible.map(m => {
                const win1 = m.score1 > m.score2;
                const win2 = m.score2 > m.score1;
                return (
                  <div key={m.id} className="flex flex-col md:flex-row md:items-center gap-3 p-4 md:px-6 hover:bg-white/5 transition-colors">
                    <div className="md:w-28 shrink-0">
                      <span className="text-sm font-black">{m.year}</span>
                      <span className="block text-[9px] text-zinc-500 uppercase font-bold">{m.type}{m.poule ? ` · ${m.poule}` : ''}</span>
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-4 md:gap-8">
                      <TeamNames team={m.team1} bold={win1} align="right" />
                      <div className="font-mono font-black italic text-lg shrink-0">
                        <span className={win1 ? 'text-red-600' : 'text-white'}>{m.score1}</span>
                        <span className="text-zinc-500"> - </span>
                        <span className={win2 ? 'text-red-600' : 'text-white'}>{m.score2}</span>
                      </div>
                      <TeamNames team={m.team2} bold={win2} align="left" />
                    </div>

                    <div className="flex justify-center md:w-10 shrink-0">
                      <ShareMatchButton gameId={m.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-800 text-zinc-400 hover:bg-red-600 hover:text-white transition-all"
              >
                Afficher plus ({filtered.length - visible.length} restants)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TeamNames({ team, bold, align }: { team: TeamRef; bold: boolean; align: 'left' | 'right' }) {
  return (
    <div className={`flex flex-col ${align === 'right' ? 'text-right items-end' : 'text-left items-start'} min-w-0`}>
      <span className={`text-xs md:text-sm truncate max-w-[140px] ${bold ? 'font-black text-orange-400' : 'font-bold text-orange-500/70'}`}>
        {team.tireurNom}
      </span>
      <span className={`text-xs md:text-sm truncate max-w-[140px] ${bold ? 'font-black text-purple-400' : 'font-bold text-purple-500/70'}`}>
        {team.pointeurNom}
      </span>
    </div>
  );
}
