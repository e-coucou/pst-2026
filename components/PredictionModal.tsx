'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Swords, Percent, Target, X } from 'lucide-react';

// Fonctions mathématiques
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  return sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
}

function normalCDF(mean: number, stdDev: number, x: number = 0): number {
  return 0.5 * (1 + erf((x - mean) / (stdDev * Math.sqrt(2))));
}

export default function PredictionModal({ matchInfo, onClose, playersMap }: { matchInfo: any, onClose: () => void, playersMap: Record<number, string> }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);

  useEffect(() => {
    if (matchInfo) calculatePrediction();
  }, [matchInfo]);

  const fetchPlayerStats = async (playerId: number) => {
    const { data } = await supabase.from('elo_history').select('elo_modern_value, sc_p, sc_c').eq('player_id', playerId).order('created_at', { ascending: false }).limit(15);
    if (!data || data.length === 0) return { mu: 1500, sigma: 200, avg_p: 8, avg_c: 8 };
    const elos = data.map(d => d.elo_modern_value || 1500);
    const mu = elos[0];
    const meanHistory = elos.reduce((a, b) => a + b, 0) / elos.length;
    let variance = elos.reduce((acc, val) => acc + Math.pow(val - meanHistory, 2), 0) / elos.length;
    if (elos.length < 5) variance += 10000; 
    const validScores = data.filter(d => d.sc_p !== null && d.sc_c !== null);
    const avg_p = validScores.length ? validScores.reduce((acc, d) => acc + d.sc_p, 0) / validScores.length : 10;
    const avg_c = validScores.length ? validScores.reduce((acc, d) => acc + d.sc_c, 0) / validScores.length : 10;
    
    return { mu, sigma: Math.max(Math.sqrt(variance), 50), avg_p, avg_c };
  };

  const calculatePrediction = async () => {
    setLoading(true);
    try {
      const { t1, t2 } = matchInfo;
      const pA = await fetchPlayerStats(t1.pointeur_id);
      const tA = await fetchPlayerStats(t1.tireur_id);
      const pB = await fetchPlayerStats(t2.pointeur_id);
      const tB = await fetchPlayerStats(t2.tireur_id);

      const mu_TeamA = (pA.mu + tA.mu) / 2;
      const sigma2_TeamA = (Math.pow(pA.sigma, 2) + Math.pow(tA.sigma, 2)) / 4;
      const mu_TeamB = (pB.mu + tB.mu) / 2;
      const sigma2_TeamB = (Math.pow(pB.sigma, 2) + Math.pow(tB.sigma, 2)) / 4;

      const diffMu = mu_TeamA - mu_TeamB;
      const totalSigma = Math.sqrt(sigma2_TeamA + sigma2_TeamB + Math.pow(150, 2));

      const probA = normalCDF(0, 1, diffMu / totalSigma); 
      const probB = 1 - probA;
      const confidence = Math.max(0, 100 - (totalSigma / 5));

      const off_A = (pA.avg_p + tA.avg_p) / 2; const def_A = (pA.avg_c + tA.avg_c) / 2;
      const off_B = (pB.avg_p + tB.avg_p) / 2; const def_B = (pB.avg_c + tB.avg_c) / 2;
      const rawPoints_A = (off_A + def_B) / 2; const rawPoints_B = (off_B + def_A) / 2;

      let scoreA, scoreB;
      if (probA > probB) {
        scoreA = 13;
        scoreB = Math.min(12, Math.round(13 * ((1 - probA) / probA) * (rawPoints_B / 13)));
        if (probA < 0.55 && scoreB < 11) scoreB = Math.floor(Math.random() * 2) + 11;
      } else {
        scoreB = 13;
        scoreA = Math.min(12, Math.round(13 * ((1 - probB) / probB) * (rawPoints_A / 13)));
        if (probB < 0.55 && scoreA < 11) scoreA = Math.floor(Math.random() * 2) + 11;
      }

      setPrediction({ probA: (probA * 100).toFixed(1), probB: (probB * 100).toFixed(1), confidence: confidence.toFixed(0), scoreA, scoreB });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-lg relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={24} /></button>
        
        <h2 className="text-xl font-black italic uppercase mb-6 flex items-center gap-2 text-white">
          <Swords className="text-red-600" /> IA Pronostic
        </h2>

        {loading || !prediction ? (
          <div className="flex flex-col items-center justify-center py-12 text-red-600 font-bold uppercase gap-4 animate-pulse">
            <Loader2 className="animate-spin" size={40} /> Analyse des historiques...
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex-1 text-right">
                <div className="text-4xl font-black text-white">{prediction.probA}%</div>
                <div className="text-[10px] text-zinc-500 mt-1 uppercase truncate">{playersMap[matchInfo.t1.pointeur_id]?.split(' ')[0]} / {playersMap[matchInfo.t1.tireur_id]?.split(' ')[0]}</div>
              </div>
              <div className="text-zinc-700 font-black italic text-xl">VS</div>
              <div className="flex-1 text-left">
                <div className="text-4xl font-black text-white">{prediction.probB}%</div>
                <div className="text-[10px] text-zinc-500 mt-1 uppercase truncate">{playersMap[matchInfo.t2.pointeur_id]?.split(' ')[0]} / {playersMap[matchInfo.t2.tireur_id]?.split(' ')[0]}</div>
              </div>
            </div>

            <div className="bg-black/50 rounded-2xl p-4 border border-white/5 my-4">
              <div className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                <Target size={14} /> Score Final Estimé
              </div>
              <div className="flex justify-center items-center gap-4 text-5xl font-black italic">
                <span className={prediction.scoreA === 13 ? 'text-red-600' : 'text-zinc-600'}>{prediction.scoreA}</span>
                <span className="text-zinc-800 text-2xl">-</span>
                <span className={prediction.scoreB === 13 ? 'text-red-600' : 'text-zinc-600'}>{prediction.scoreB}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold text-zinc-400">
                <span>Fiabilité du pronostic</span>
                <span className="text-white">{prediction.confidence}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full ${prediction.confidence > 70 ? 'bg-green-500' : prediction.confidence > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${prediction.confidence}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
