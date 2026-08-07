'use client';

import { useState } from 'react';
import { Brain, X, Loader2, Check, X as XIcon } from 'lucide-react';

interface PredictionResponse {
  game: { id: number; year: number | null; type: string; poule: string | null; score1: number; score2: number };
  team1: { tireur: string; pointeur: string };
  team2: { tireur: string; pointeur: string };
  classic: { probA: number; probB: number };
  modern: { probA: number; probB: number };
  dynamic: { probA: number; probB: number; probDraw: number };
  actualWinner: 'team1' | 'team2' | 'draw';
}

function pct(v: number): string {
  return `${(v * 100).toFixed(0)}%`;
}

function calledRight(probA: number, probB: number, actualWinner: 'team1' | 'team2' | 'draw'): boolean {
  if (actualWinner === 'draw') return false;
  const favorite = probA >= probB ? 'team1' : 'team2';
  return favorite === actualWinner;
}

export default function MatchPredictionButton({
  gameId,
  mode = 'archived',
  className,
}: {
  gameId: number;
  // 'archived' = match déjà archivé (table games), 'live' = match du tournoi en cours (table
  // live_matches) — deux routes distinctes, même format de réponse.
  mode?: 'archived' | 'live';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PredictionResponse | null>(null);

  const endpoint = mode === 'live' ? `/api/predict/live-match/${gameId}` : `/api/predict/match/${gameId}`;

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(true);
    if (data) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={className ?? 'p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all'}
        title="Prédiction a posteriori"
        aria-label="Prédiction a posteriori"
      >
        <Brain size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-md relative shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />

            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Brain size={16} className="text-emerald-500" />
              Prédiction a posteriori
            </h3>

            {loading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
              </div>
            ) : !data ? (
              <p className="text-zinc-400 text-xs uppercase font-bold text-center py-8">Erreur de chargement</p>
            ) : (
              <div className="space-y-5">
                <div className="text-center text-[10px] font-bold uppercase text-zinc-500 tracking-widest">
                  {data.team1.tireur} &amp; {data.team1.pointeur}
                  <span className="text-zinc-600 mx-2">vs</span>
                  {data.team2.tireur} &amp; {data.team2.pointeur}
                </div>

                <div className="text-center font-mono text-2xl font-black italic">
                  {data.game.score1} - {data.game.score2}
                </div>

                <PredictionRow
                  label="Classic"
                  color="text-red-500"
                  probA={data.classic.probA}
                  probB={data.classic.probB}
                  right={calledRight(data.classic.probA, data.classic.probB, data.actualWinner)}
                />

                <PredictionRow
                  label="Modern"
                  color="text-purple-400"
                  probA={data.modern.probA}
                  probB={data.modern.probB}
                  right={calledRight(data.modern.probA, data.modern.probB, data.actualWinner)}
                />

                <PredictionRow
                  label="Dynamique"
                  color="text-emerald-400"
                  probA={data.dynamic.probA}
                  probB={data.dynamic.probB}
                  probDraw={data.dynamic.probDraw}
                  right={calledRight(data.dynamic.probA, data.dynamic.probB, data.actualWinner)}
                />

                <p className="text-[9px] text-zinc-500 uppercase tracking-widest text-center">
                  Calcul a posteriori, ELO pré-match reconstitué — sans forme du jour ni explosivité (module live).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function PredictionRow({
  label,
  color,
  probA,
  probB,
  probDraw,
  right,
}: {
  label: string;
  color: string;
  probA: number;
  probB: number;
  probDraw?: number;
  right: boolean;
}) {
  return (
    <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</span>
        {right ? (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase text-green-500">
            <Check size={12} /> Favori confirmé
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-black uppercase text-red-500">
            <XIcon size={12} /> Favori déjoué
          </span>
        )}
      </div>
      <div className="flex items-center justify-between font-mono font-black text-lg">
        <span>{pct(probA)}</span>
        {probDraw != null && <span className="text-[10px] text-zinc-500 font-bold">Nul {pct(probDraw)}</span>}
        <span>{pct(probB)}</span>
      </div>
    </div>
  );
}
