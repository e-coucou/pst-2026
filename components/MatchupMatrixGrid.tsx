'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Grid3x3 } from 'lucide-react';

interface MatchupCell {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
}

interface PlayerOption {
  id: number;
  nom: string;
}

type MetricKey = 'matches' | 'wins' | 'losses' | 'draws';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'matches', label: 'Matchs' },
  { key: 'wins', label: 'Victoires' },
  { key: 'losses', label: 'Défaites' },
  { key: 'draws', label: 'Nuls' },
];

const CELL_SIZE = 32;
const HEADER_HEIGHT = 130;
const ROW_LABEL_WIDTH = 140;

function cellBackground(cell: MatchupCell | undefined, metric: MetricKey): string {
  if (!cell || cell.matches === 0) return 'rgba(255,255,255,0.02)';
  if (metric === 'draws') {
    return cell.draws > 0 ? 'rgba(161,161,170,0.22)' : 'rgba(255,255,255,0.02)';
  }

  const decisive = cell.wins + cell.losses;
  if (decisive === 0) return 'rgba(161,161,170,0.22)'; // que des nuls

  const ratio = cell.wins / decisive; // point de vue du joueur "ligne"
  const diff = ratio - 0.5; // [-0.5, 0.5]
  const intensity = Math.min(1, Math.abs(diff) / 0.5);
  const alpha = 0.12 + intensity * 0.6;
  return diff >= 0 ? `rgba(34,197,94,${alpha})` : `rgba(239,68,68,${alpha})`;
}

export default function MatchupMatrixGrid({
  players,
  matrix,
  title = 'Matrice des confrontations',
  relationLabel = 'contre',
  positiveLabel = 'domine',
  negativeLabel = 'dominé',
  getHref = (aId, bId) => `/joueurs/face-a-face?a=${aId}&b=${bId}`,
}: {
  players: PlayerOption[];
  matrix: Record<number, Record<number, MatchupCell>>;
  title?: string;
  // Verbe reliant les deux joueurs dans la légende, ex. "contre" (adversaires) ou "avec" (coéquipiers).
  relationLabel?: string;
  positiveLabel?: string;
  negativeLabel?: string;
  // Retourne le lien de la case, ou null pour désactiver le clic (pas de page de détail pour cette relation).
  getHref?: (aId: number, bId: number) => string | null;
}) {
  const [metric, setMetric] = useState<MetricKey>('matches');

  // On n'affiche que les joueurs ayant au moins une confrontation enregistrée.
  const activePlayers = useMemo(
    () => players.filter(p => matrix[p.id] && Object.keys(matrix[p.id]).length > 0),
    [players, matrix]
  );

  if (activePlayers.length === 0) {
    return null;
  }

  return (
    <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Grid3x3 size={18} className="text-red-600" />
          {title}
        </h2>

        <div className="flex items-center gap-1.5 flex-wrap">
          {METRICS.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                metric === m.key ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
        Chaque case = bilan du joueur de la ligne {relationLabel} celui de la colonne.{' '}
        <span className="text-green-500">Vert</span> = {positiveLabel},{' '}
        <span className="text-red-500">rouge</span> = {negativeLabel},{' '}
        <span className="text-zinc-400">gris</span> = 50/50 ou nuls uniquement.
      </p>

      <div className="overflow-auto max-h-[70vh] rounded-2xl border border-white/5">
        <table className="border-separate border-spacing-0">
          <thead>
            <tr>
              <th
                className="sticky top-0 left-0 z-30 bg-black"
                style={{ width: ROW_LABEL_WIDTH, height: HEADER_HEIGHT }}
              />
              {activePlayers.map(colP => (
                <th
                  key={colP.id}
                  title={colP.nom}
                  className="sticky top-0 z-20 bg-black align-bottom pb-2"
                  style={{ width: CELL_SIZE, height: HEADER_HEIGHT }}
                >
                  <div
                    className="text-[10px] font-bold uppercase text-zinc-400 whitespace-nowrap mx-auto w-fit"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {colP.nom}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activePlayers.map(rowP => (
              <tr key={rowP.id}>
                <th
                  scope="row"
                  title={rowP.nom}
                  className="sticky left-0 z-10 bg-black text-left px-3 text-[11px] font-bold text-zinc-300 truncate"
                  style={{ width: ROW_LABEL_WIDTH, height: CELL_SIZE, maxWidth: ROW_LABEL_WIDTH }}
                >
                  {rowP.nom}
                </th>
                {activePlayers.map(colP => {
                  if (rowP.id === colP.id) {
                    return (
                      <td
                        key={colP.id}
                        className="border border-white/[0.03]"
                        style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: 'rgba(255,255,255,0.015)' }}
                      />
                    );
                  }

                  const cell = matrix[rowP.id]?.[colP.id];
                  const value = cell ? cell[metric] : 0;
                  const href = cell ? getHref(rowP.id, colP.id) : null;
                  const tooltip = cell
                    ? `${rowP.nom} ${relationLabel} ${colP.nom} — ${cell.matches} match(s), ${cell.wins}V / ${cell.losses}D / ${cell.draws}N`
                    : undefined;

                  return (
                    <td
                      key={colP.id}
                      className="border border-white/[0.03] p-0"
                      style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: cellBackground(cell, metric) }}
                    >
                      {href ? (
                        <Link
                          href={href}
                          title={tooltip}
                          className="flex items-center justify-center w-full h-full text-[10px] font-mono font-bold text-white hover:outline hover:outline-1 hover:outline-red-600 transition-all"
                        >
                          {value}
                        </Link>
                      ) : (
                        <div
                          title={tooltip}
                          className={`flex items-center justify-center w-full h-full text-[10px] font-mono font-bold ${cell ? 'text-white' : 'text-zinc-700'}`}
                        >
                          {value}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
