'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, X, Zap, TrendingUp, Target, Swords, Clock } from 'lucide-react';

// --- OUTILS MATHÉMATIQUES DE PRÉCISION ---
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  return sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
}

function normalCDF(mean: number, stdDev: number, x: number = 0): number {
  const res = 0.5 * (1 + erf((x - mean) / (stdDev * Math.sqrt(2))));
  return isNaN(res) ? 0.5 : res;
}

export default function PredictionModal({ matchInfo, onClose, playersMap }: { matchInfo: any, onClose: () => void, playersMap: Record<number, string> }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);

  // Helper pour les noms
  const getPlayerName = (id: number) => playersMap[id] || `Joueur ${id}`;

  useEffect(() => {
    if (matchInfo) calculatePrediction();
  }, [matchInfo]);

  const fetchPlayerStats = async (playerId: number, teamId: string) => {
    // 1. Historique Elo & Explosivité (Table elo_history)
    const { data: history } = await supabase
      .from('elo_history')
      .select('elo_modern_value, sc_p, sc_c')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(15);

    // 2. Forme du moment (Table live_matches)
    const today = new Date().toISOString().split('T')[0];
    const { data: recentGames } = await supabase
      .from('live_matches')
      .select('score_team1, score_team2, team1_id, team2_id')
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('status', 'TERMINE')
      .gte('updated_at', today);

    let formBonus = 0;
    if (recentGames && recentGames.length > 0) {
      const diffs = recentGames.map(g => {
        const isTeam1 = g.team1_id === teamId;
        return isTeam1 ? (g.score_team1 - g.score_team2) : (g.score_team2 - g.score_team1);
      });
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      formBonus = avgDiff * 12; // Coefficient de forme agressif
    }

    const lastElo = history?.[0]?.elo_modern_value ?? 1500;
    const validScores = history?.filter(h => h.sc_p !== null) ?? [];
    
    // Calcul de la variance pour l'explosivité
    let explosivity = 1;
    if (validScores.length > 0) {
      const avg_p = validScores.reduce((acc, h) => acc + h.sc_p, 0) / validScores.length;
      const variance = validScores.reduce((acc, h) => acc + Math.pow(h.sc_p - avg_p, 2), 0) / validScores.length;
      explosivity = 1 + (Math.sqrt(variance) / 13);
    }

    return { 
      mu: lastElo + formBonus, 
      explosivity: isNaN(explosivity) ? 1 : explosivity,
      formBonus 
    };
  };

  const calculatePrediction = async () => {
    setLoading(true);
    try {
      const { match, t1, t2 } = matchInfo;
      const isPoule = match.type?.toLowerCase() === 'poule';

      // Données Equipe 1
      const p1 = await fetchPlayerStats(t1.pointeur_id, t1.id);
      const t1_stat = await fetchPlayerStats(t1.tireur_id, t1.id);
      // Données Equipe 2
      const p2 = await fetchPlayerStats(t2.pointeur_id, t2.id);
      const t2_stat = await fetchPlayerStats(t2.tireur_id, t2.id);

      const muA = (p1.mu + t1_stat.mu) / 2;
      const muB = (p2.mu + t2_stat.mu) / 2;
      const avgExplosivity = (p1.explosivity + t1_stat.explosivity + p2.explosivity + t2_stat.explosivity) / 4;
      
      const diffMu = muA - muB;
      const totalSigma = 212.13; // Math.sqrt(150^2 + 150^2)

      let probA, probB, probTie = 0;
      let scoreA = 0, scoreB = 0;

      if (isPoule) {
        // --- LOGIQUE POULE (VOLATILITÉ ACCENTUÉE) ---
        const drawMargin = 20; 
        probB = normalCDF(0, 1, (-drawMargin - diffMu) / totalSigma);
        probA = 1 - normalCDF(0, 1, (drawMargin - diffMu) / totalSigma);
        probTie = Math.max(0, 1 - (probA + probB));

        if (probTie > probA && probTie > probB) {
          scoreA = 6; scoreB = 6;
        } else {
          const isAWinner = probA > probB;
          const winProb = isAWinner ? probA : probB;
          const ratio = Math.max(0, (winProb - 0.5) / 0.5);
          const domination = Math.pow(ratio, 0.6) * avgExplosivity;
          
          const winnerScore = Math.min(13, 9 + Math.round(domination * 4));
          const margin = Math.round(domination * 12);
          
          if (isAWinner) {
            scoreA = winnerScore;
            scoreB = Math.max(0, scoreA - margin);
            if (domination > 0.75) scoreB = Math.min(scoreB, 1); // Scores type 11-1
          } else {
            scoreB = winnerScore;
            scoreA = Math.max(0, scoreB - margin);
            if (domination > 0.75) scoreA = Math.min(scoreA, 1);
          }
        }
      } else {
        // --- LOGIQUE ÉLIMINATOIRE ---
        probA = normalCDF(0, 1, diffMu / totalSigma);
        probB = 1 - probA;
        if (probA > probB) {
          scoreA = 13;
          scoreB = Math.max(0, 13 - Math.round(probA * 12));
        } else {
          scoreB = 13;
          scoreA = Math.max(0, 13 - Math.round(probB * 12));
        }
      }

      setPrediction({
        isPoule,
        probA: (probA * 100).toFixed(0),
        probB: (probB * 100).toFixed(0),
        probTie: (probTie * 100).toFixed(0),
        scoreA, scoreB,
        namesA: `${getPlayerName(t1.pointeur_id)} / ${getPlayerName(t1.tireur_id)}`,
        namesB: `${getPlayerName(t2.pointeur_id)} / ${getPlayerName(t2.tireur_id)}`,
        formA: (p1.formBonus + t1_stat.formBonus) / 2,
        formB: (p2.formBonus + t2_stat.formBonus) / 2,
        confidence: Math.min(98, 45 + (Math.abs(probA - probB) * 110)).toFixed(0)
      });
    } catch (e) {
      console.error("Prediction Error:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-md relative shadow-2xl overflow-hidden">
        {/* Décoration d'arrière-plan */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl"></div>
        
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10"><X size={24} /></button>
        
        <div className="flex flex-col items-center mb-8 relative">
          <div className="p-3 bg-red-600/20 rounded-2xl mb-2 border border-red-600/30">
            <Zap className="text-red-600" size={24} fill="currentColor" />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">Intelligence Artificielle</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-[1px] w-4 bg-zinc-700"></div>
            <span className="text-xs font-bold text-red-600 tracking-tighter">PRÉDICTION LIVE</span>
            <div className="h-[1px] w-4 bg-zinc-700"></div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-red-600" size={40} />
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-zinc-400 uppercase animate-pulse">Calcul de probabilité...</span>
                <span className="text-[9px] text-zinc-600">Analyse des moyennes de scores</span>
            </div>
          </div>
        ) : prediction && (
          <div className="space-y-8 relative">
            
            {/* Duel de Probabilités */}
            <div className="grid grid-cols-7 items-center gap-2">
              <div className="col-span-3 text-center space-y-3">
                <div className="text-5xl font-black text-white tracking-tighter">{prediction.probA}%</div>
                <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-zinc-300 leading-tight uppercase min-h-[32px] flex items-center justify-center px-1">
                        {prediction.namesA}
                    </div>
                    {prediction.formA > 0 && (
                        <div className="flex items-center justify-center gap-1 text-[8px] text-green-500 font-black uppercase italic">
                            <TrendingUp size={10} /> Forme +
                        </div>
                    )}
                </div>
              </div>
              
              <div className="col-span-1 flex flex-col items-center gap-2">
                <div className="text-zinc-700 font-black italic">VS</div>
                {prediction.isPoule && (
                  <div className="text-[8px] bg-white/5 text-zinc-500 px-1.5 py-0.5 rounded border border-white/5 font-bold">
                    NUL:{prediction.probTie}%
                  </div>
                )}
              </div>

              <div className="col-span-3 text-center space-y-3">
                <div className="text-5xl font-black text-white tracking-tighter">{prediction.probB}%</div>
                <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-zinc-300 leading-tight uppercase min-h-[32px] flex items-center justify-center px-1">
                        {prediction.namesB}
                    </div>
                    {prediction.formB > 0 && (
                        <div className="flex items-center justify-center gap-1 text-[8px] text-green-500 font-black uppercase italic">
                            <TrendingUp size={10} /> Forme +
                        </div>
                    )}
                </div>
              </div>
            </div>

            {/* Score Prédit Stylisé */}
            <div className="bg-black/40 rounded-[2rem] p-8 border border-white/5 relative shadow-inner">
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] whitespace-nowrap">
                    Score final probable
                </div>
                <div className="flex justify-center items-center gap-8 text-7xl font-black italic text-white mt-2">
                  <span className={Number(prediction.scoreA) > Number(prediction.scoreB) ? 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-500'}>
                    {prediction.scoreA}
                  </span>
                  <span className="text-zinc-800 text-3xl">-</span>
                  <span className={Number(prediction.scoreB) > Number(prediction.scoreA) ? 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'text-zinc-500'}>
                    {prediction.scoreB}
                  </span>
                </div>
                {prediction.isPoule && (
                    <div className="mt-4 flex justify-center items-center gap-1.5">
                        <Clock size={10} className="text-zinc-600" />
                        <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Temps réglementaire 20'</span>
                    </div>
                )}
            </div>

            {/* Barre de confiance */}
            <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-zinc-500 tracking-tighter">
                    <div className="flex items-center gap-2">
                        <Target size={12} className="text-red-600" />
                        <span>Indice de fiabilité</span>
                    </div>
                    <span className="text-white">{prediction.confidence}%</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden p-[2px]">
                    <div 
                        className="h-full bg-gradient-to-r from-red-800 to-red-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(220,38,38,0.5)]" 
                        style={{ width: `${prediction.confidence}%` }}
                    ></div>
                </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}
