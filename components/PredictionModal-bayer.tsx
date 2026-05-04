'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, X, Zap, TrendingUp, Target, Swords, Clock } from 'lucide-react';

// ============================================================================
// CONFIGURATION DU MODÈLE BAYÉSIEN-MARKOVIEN
// ============================================================================
const PREDICTION_CONFIG = {
  // Volatilité a priori (Bayésien)
  volatilityPerPlayer: 150,

  formBonus: {
    maxDailyBonus: 40,
    coefficientPerPointDiff: 8,
    minGamesForReliability: 1,
  },

  explosivity: {
    historicalMatchesRequired: 15,
    minMatchesForValidCalculation: 5,
    normalizationFactor: 13,
  },

  // Chaîne de Markov - Transition probabiliste point-par-point
  markov: {
    // Modèle logistique : P(A marque) = 1 / (1 + exp(-k * diffElo))
    // k = sensibilité (plus élevé = moins de surprises)
    logisticSensitivity: 0.015,
    
    // Moments psychologiques (momentum)
    // Si A a marqué les 3 derniers points, boost sa proba
    momentumBoostPerPoint: 0.02,  // +2% par point consécutif (max 3 points)
  },

  // Distribution Zipf sur résultats finaux
  zipf: {
    // Paramètre alpha (puissance de la loi)
    // alpha=1 : très plate (uniforme)
    // alpha=2 : modéré (quelques résultats dominent)
    // alpha=3+ : très concentré (peu de résultats possibles)
    alpha: 1.4,  // À calibrer sur historique
  },

  poule: {
    drawMargin: 12,  // Réduit pour moins de nuls
    maxScoreWhenDominating: 13,
    minScoreLossThreshold: 1,
  },
};

// ============================================================================
// OUTILS MATHÉMATIQUES
// ============================================================================

/**
 * Fonction logistique : P(A gagne point) = sigmoid(x)
 * Remplace la normale par une fonction plus naturelle pour "probabilité d'un point"
 */
function sigmoid(x: number): number {
  if (x > 20) return 1.0;
  if (x < -20) return 0.0;
  return 1.0 / (1.0 + Math.exp(-x));
}

/**
 * Distribution Zipf normalisée
 * P(rang r) = 1 / (r^α) / Σ(1/i^α)
 * Utilité : pondérer les résultats finaux du match
 */
function zipfProbability(rank: number, alpha: number, maxRank: number): number {
  // Harmonic number H_n(α) = Σ(1/i^α) pour i=1 to n
  let harmonicSum = 0;
  for (let i = 1; i <= maxRank; i++) {
    harmonicSum += 1 / Math.pow(i, alpha);
  }
  return (1 / Math.pow(rank, alpha)) / harmonicSum;
}

/**
 * Entropy d'une distribution Zipf
 * Plus alpha est grand, moins il y a d'entropie (résultats plus prévisibles)
 */
function zipfEntropy(alpha: number, maxRank: number): number {
  let entropy = 0;
  for (let i = 1; i <= maxRank; i++) {
    const p = zipfProbability(i, alpha, maxRank);
    if (p > 0) entropy -= p * Math.log(p);
  }
  return entropy;
}

// ============================================================================
// SIMULATION MARKOVIENNE POINT-PAR-POINT
// ============================================================================

interface MatchState {
  scoreA: number;
  scoreB: number;
  momentumA: number;  // Nombre de points consécutifs marqués par A (0-3)
}

/**
 * Calcule P(A marque le prochain point) à un état donné du match
 * Tenant compte : ELO, form, momentum psychologique
 */
function calculatePointProbability(
  state: MatchState,
  muA: number,
  muB: number,
  explosivityA: number,
  explosivityB: number,
  isPoule: boolean
): number {
  // 1. COMPOSANTE BAYÉSIENNE : différence ELO
  const eloDiff = muA - muB;
  
  // 2. COMPOSANTE EXPLOSIVITÉ : volatilité propre
  const explosivityEffect = (explosivityA - explosivityB) * 20; // Scaling
  
  // 3. COMPOSANTE MOMENTUM : Si A marque 3 points d'affilée, confiance boost
  const momentumBoost = Math.min(
    PREDICTION_CONFIG.markov.momentumBoostPerPoint * Math.min(3, state.momentumA),
    0.06  // Cap à ±6% de boost momentum
  );
  
  // 4. FACTEUR POULE vs ÉLIMINATOIRE
  // En poule, plus de variance (moins de déterminisme)
  const volatilityFactor = isPoule ? 1.6 : 1.0;
  
  // Combiner avec fonction logistique
  const exponent = 
    (eloDiff + explosivityEffect + momentumBoost * 200) * 
    PREDICTION_CONFIG.markov.logisticSensitivity * 
    volatilityFactor;
  
  return sigmoid(exponent);
}

/**
 * Simule un match point-par-point SANS tirage aléatoire
 * Retourne tous les chemins possibles avec leurs probabilités
 * 
 * Utilise la PROGRAMMATION DYNAMIQUE pour énumérer efficacement
 * les états et leurs probabilités cumulées
 */
function simulateMatchDynamic(
  muA: number,
  muB: number,
  explosivityA: number,
  explosivityB: number,
  isPoule: boolean,
  maxPointsPerTeam: number = 13
): Map<string, number> {
  // Clé = "scoreA-scoreB", Valeur = probabilité cumulée d'atteindre cet état
  let stateProbs = new Map<string, number>();
  let stateProbs_new = new Map<string, number>();
  
  const initialState = "0-0";
  stateProbs.set(initialState, 1.0);
  
  // DP : itérer sur tous les points possibles
  for (let pointNum = 0; pointNum < maxPointsPerTeam * 2 - 1; pointNum++) {
    stateProbs_new.clear();
    
    for (const [stateKey, prob] of stateProbs.entries()) {
      const [scoreA, scoreB] = stateKey.split('-').map(Number);
      
      // Vérifier si état terminal (l'une des équipes a gagné)
      if (isPoule) {
        // Poule : première à 7 ou nul à 6-6
        if ((scoreA === 6 && scoreB === 6) || scoreA === 7 || scoreB === 7) {
          stateProbs_new.set(stateKey, (stateProbs_new.get(stateKey) ?? 0) + prob);
          continue;
        }
      } else {
        // Éliminatoire : première à 13
        if (scoreA === maxPointsPerTeam || scoreB === maxPointsPerTeam) {
          stateProbs_new.set(stateKey, (stateProbs_new.get(stateKey) ?? 0) + prob);
          continue;
        }
      }
      
      // Calculer momentum
      const momentumA = Math.min(3, scoreA > scoreB ? 3 : Math.max(0, scoreA - scoreB));
      const state: MatchState = { scoreA, scoreB, momentumA };
      
      // Probabilité que A marque le prochain point
      const pA = calculatePointProbability(
        state,
        muA, muB,
        explosivityA, explosivityB,
        isPoule
      );
      const pB = 1 - pA;
      
      // Transition 1 : A marque
      const nextStateA = `${scoreA + 1}-${scoreB}`;
      stateProbs_new.set(nextStateA, (stateProbs_new.get(nextStateA) ?? 0) + prob * pA);
      
      // Transition 2 : B marque
      const nextStateB = `${scoreA}-${scoreB + 1}`;
      stateProbs_new.set(nextStateB, (stateProbs_new.get(nextStateB) ?? 0) + prob * pB);
    }
    
    // Swap
    const temp = stateProbs;
    stateProbs = stateProbs_new;
    stateProbs_new = temp;
  }
  
  return stateProbs;
}

/**
 * Extrait les états finaux (victoires) et les pondère avec Zipf
 */
function extractVictoriesWithZipf(
  stateProbs: Map<string, number>,
  isPoule: boolean,
  alpha: number
): { probA: number; probTie: number; probB: number; scoreDistribution: Map<string, number> } {
  const victories: Array<{ score: string; prob: number; winner: 'A' | 'B' | 'Tie' }> = [];
  
  // Énumérer les états finaux
  for (const [stateKey, prob] of stateProbs.entries()) {
    const [scoreA, scoreB] = stateKey.split('-').map(Number);
    
    let winner: 'A' | 'B' | 'Tie' | null = null;
    
    if (isPoule) {
      if (scoreA === 6 && scoreB === 6) winner = 'Tie';
      else if (scoreA === 7) winner = 'A';
      else if (scoreB === 7) winner = 'B';
    } else {
      if (scoreA === 13) winner = 'A';
      else if (scoreB === 13) winner = 'B';
    }
    
    if (winner) {
      victories.push({ score: stateKey, prob, winner });
    }
  }
  
  // Trier par score (différentiel) pour appliquer Zipf
  victories.sort((a, b) => {
	const scoreA_pts = a.score.split('-').map(Number);
    const scoreB_pts = b.score.split('-').map(Number);
    const diffA = Math.abs(parseInt(a.score.split('-')[0]) - parseInt(a.score.split('-')[1]));
    const diffB = Math.abs(parseInt(b.score.split('-')[0]) - parseInt(b.score.split('-')[1]));
    return diffB - diffA; // Plus grand écart = rang 1
  });
  
  // Appliquer répondération Zipf
  const scoreDistribution = new Map<string, number>();
  let probA = 0, probB = 0, probTie = 0;
  
  let aVictories = victories.filter(v => v.winner === 'A');
  let bVictories = victories.filter(v => v.winner === 'B');
  let tieVictories = victories.filter(v => v.winner === 'Tie');
  
  // Zipf sur résultats A
  aVictories.forEach((v, idx) => {
    const zipfWeight = zipfProbability(idx + 1, alpha, Math.max(aVictories.length, 1));
    const weightedProb = v.prob * zipfWeight;
    scoreDistribution.set(v.score, (scoreDistribution.get(v.score) ?? 0) + weightedProb);
    probA += weightedProb;
  });
  
  // Zipf sur résultats B
  bVictories.forEach((v, idx) => {
    const zipfWeight = zipfProbability(idx + 1, alpha, Math.max(bVictories.length, 1));
    const weightedProb = v.prob * zipfWeight;
    scoreDistribution.set(v.score, (scoreDistribution.get(v.score) ?? 0) + weightedProb);
    probB += weightedProb;
  });
  
  // Nuls (pas de Zipf, juste le résultat direct)
  tieVictories.forEach(v => {
    scoreDistribution.set(v.score, (scoreDistribution.get(v.score) ?? 0) + v.prob);
    probTie += v.prob;
  });
  
  // Renormaliser pour que la somme = 1.0
  const total = probA + probB + probTie;
  if (total > 0) {
    probA /= total;
    probB /= total;
    probTie /= total;
    for (const key of scoreDistribution.keys()) {
      scoreDistribution.set(key, (scoreDistribution.get(key) ?? 0) / total);
    }
  }
  
  return { probA, probTie, probB, scoreDistribution };
}

/**
 * Extrait le score MODAL (le plus probable) de la distribution
 */
function getModalScore(scoreDistribution: Map<string, number>): string {
  let maxProb = 0;
  let modalScore = '6-6';
  
  for (const [score, prob] of scoreDistribution.entries()) {
    if (prob > maxProb) {
      maxProb = prob;
      modalScore = score;
    }
  }
  
  return modalScore;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function PredictionModal({
  matchInfo,
  onClose,
  playersMap,
}: {
  matchInfo: any;
  onClose: () => void;
  playersMap: Record<number, string>;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [prediction, setPrediction] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const getPlayerName = (id: number) => playersMap[id] || `Joueur ${id}`;

  useEffect(() => {
    if (matchInfo) calculatePrediction();
  }, [matchInfo]);

  const fetchPlayerStats = async (playerId: number, teamId: string) => {
    const { data: history } = await supabase
      .from('elo_history')
      .select('elo_modern_value, sc_p, sc_c')
      .eq('player_id', playerId)
      .order('game_id', { ascending: false })
      .limit(PREDICTION_CONFIG.explosivity.historicalMatchesRequired);

    const today = new Date().toISOString().split('T')[0];
    const { data: recentGames } = await supabase
      .from('live_matches')
      .select('score_team1, score_team2, team1_id, team2_id')
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('status', 'TERMINE');

    let formBonus = 0;
    let nGamesToday = 0;
    if (recentGames && recentGames.length >= PREDICTION_CONFIG.formBonus.minGamesForReliability) {
      nGamesToday = recentGames.length;
      const diffs = recentGames.map((g) => {
        const isTeam1 = g.team1_id === teamId;
        return isTeam1
          ? g.score_team1 - g.score_team2
          : g.score_team2 - g.score_team1;
      });

      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const rawBonus = avgDiff * PREDICTION_CONFIG.formBonus.coefficientPerPointDiff;
      
      formBonus = Math.max(
        -PREDICTION_CONFIG.formBonus.maxDailyBonus,
        Math.min(PREDICTION_CONFIG.formBonus.maxDailyBonus, rawBonus)
      );

      if (nGamesToday < 3) {
        formBonus *= (nGamesToday / 3);
      }
    }

    const lastElo = history?.[0]?.elo_modern_value ?? 1500;

    let explosivity = 1.0;
    let explosivityQuality = 'low';
    const validScores = history?.filter((h) => h.sc_p !== null && h.sc_p !== undefined) ?? [];
    
    if (validScores.length >= PREDICTION_CONFIG.explosivity.minMatchesForValidCalculation) {
      const avg_p = validScores.reduce((acc, h) => acc + h.sc_p, 0) / validScores.length;
      const variance =
        validScores.reduce((acc, h) => acc + Math.pow(h.sc_p - avg_p, 2), 0) /
        validScores.length;
      
      explosivity = 1 + Math.sqrt(variance) / PREDICTION_CONFIG.explosivity.normalizationFactor;
      explosivity = isNaN(explosivity) ? 1.0 : explosivity;
      
      if (validScores.length >= 10) {
        explosivityQuality = 'high';
      } else if (validScores.length >= 5) {
        explosivityQuality = 'medium';
      }
    }

    return {
      mu: lastElo + formBonus,
      explosivity,
      formBonus,
      nHistoricalMatches: validScores.length,
      nGamesToday,
      explosivityQuality,
      eloBase: lastElo,
    };
  };

  const calculatePrediction = async () => {
    setLoading(true);
    try {
      const { match, t1, t2 } = matchInfo;
      const isPoule = match.type?.toLowerCase() === 'poule';

      // FETCH STATS
      const pointeurTeam1 = await fetchPlayerStats(t1.pointeur_id, t1.id);
      const tireurTeam1 = await fetchPlayerStats(t1.tireur_id, t1.id);
      const pointeurTeam2 = await fetchPlayerStats(t2.pointeur_id, t2.id);
      const tireurTeam2 = await fetchPlayerStats(t2.tireur_id, t2.id);

      // PRIOR BAYÉSIEN : Moyenne des ELO
      const muA = (pointeurTeam1.mu + tireurTeam1.mu) / 2;
      const muB = (pointeurTeam2.mu + tireurTeam2.mu) / 2;

      // Explosivité moyenne (volatilité individuelle)
      const explosivityA = (pointeurTeam1.explosivity + tireurTeam1.explosivity) / 2;
      const explosivityB = (pointeurTeam2.explosivity + tireurTeam2.explosivity) / 2;

      // ⭐ SIMULATION MARKOVIENNE POINT-PAR-POINT
      const stateProbs = simulateMatchDynamic(
        muA, muB,
        explosivityA, explosivityB,
        isPoule,
        isPoule ? 7 : 13
      );

      // ⭐ EXTRACTION DES VICTOIRES AVEC ZIPF
      const { probA, probB, probTie, scoreDistribution } = extractVictoriesWithZipf(
        stateProbs,
        isPoule,
        PREDICTION_CONFIG.zipf.alpha
      );

      // Score modal (le plus probable)
      const modalScore = getModalScore(scoreDistribution);
      const [scoreA, scoreB] = modalScore.split('-').map(Number);

      // CONFIANCE HYBRIDE
      const confidenceFactors = {
        historicalDataReliability: Math.min(
          100,
          (Math.min(
            pointeurTeam1.nHistoricalMatches,
            tireurTeam1.nHistoricalMatches,
            pointeurTeam2.nHistoricalMatches,
            tireurTeam2.nHistoricalMatches
          ) / 20) * 100
        ),

        explosivityReliability: (() => {
          const qualities = [
            pointeurTeam1.explosivityQuality,
            tireurTeam1.explosivityQuality,
            pointeurTeam2.explosivityQuality,
            tireurTeam2.explosivityQuality,
          ].sort();
          const median = qualities[1];
          return {
            high: 100,
            medium: 70,
            low: 40,
          }[median] ?? 40;
        })(),

        formBonosReliability: (() => {
          const nGamesToday = Math.min(
            pointeurTeam1.nGamesToday,
            tireurTeam1.nGamesToday,
            pointeurTeam2.nGamesToday,
            tireurTeam2.nGamesToday
          );
          if (nGamesToday === 0) return 30;
          if (nGamesToday === 1) return 60;
          return 90;
        })(),

        predictionClarity: Math.min(
          100,
          Math.abs(probA - probB) * 100 * 2
        ),
      };

      const confidence = Math.round(
        (confidenceFactors.historicalDataReliability * 0.35 +
          confidenceFactors.explosivityReliability * 0.25 +
          confidenceFactors.formBonosReliability * 0.15 +
          confidenceFactors.predictionClarity * 0.25)
      );

      const debug = {
        muA,
        muB,
        explosivityA,
        explosivityB,
        probAraw: (probA * 100).toFixed(1),
        probBraw: (probB * 100).toFixed(1),
        probTieRaw: (probTie * 100).toFixed(1),
        modalScore,
        scoreDistribution: Array.from(scoreDistribution.entries()).slice(0, 5),
        confidenceFactors,
      };

      setPrediction({
        isPoule,
        probA: (probA * 100).toFixed(0),
        probB: (probB * 100).toFixed(0),
        probTie: (probTie * 100).toFixed(0),
        scoreA,
        scoreB,
        namesA: `${getPlayerName(t1.pointeur_id)} / ${getPlayerName(t1.tireur_id)}`,
        namesB: `${getPlayerName(t2.pointeur_id)} / ${getPlayerName(t2.tireur_id)}`,
        formA: ((pointeurTeam1.formBonus + tireurTeam1.formBonus) / 2).toFixed(0),
        formB: ((pointeurTeam2.formBonus + tireurTeam2.formBonus) / 2).toFixed(0),
        confidence: String(Math.min(98, confidence)),
      });

      setDebugInfo(debug);
      console.log('[PREDICTION BAYESIAN-MARKOV-ZIPF]', debug);
    } catch (e) {
      console.error('[PREDICTION ERROR]', e);
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-md relative shadow-2xl overflow-hidden">
        {/* Décoration d'arrière-plan */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white z-10"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center mb-8 relative">
          <div className="p-3 bg-red-600/20 rounded-2xl mb-2 border border-red-600/30">
            <Zap className="text-red-600" size={24} fill="currentColor" />
          </div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
            Intelligence Artificielle
          </h2>
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
              <span className="text-[10px] font-black text-zinc-400 uppercase animate-pulse">
                Simulation Markovienne...
              </span>
              <span className="text-[9px] text-zinc-600">Énumération point-par-point</span>
            </div>
          </div>
        ) : prediction && (
          <div className="space-y-8 relative">
            {/* Duel de Probabilités */}
            <div className="grid grid-cols-7 items-center gap-2">
              <div className="col-span-3 text-center space-y-3">
                <div className="text-5xl font-black text-white tracking-tighter">
                  {prediction.probA}%
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-bold text-zinc-300 leading-tight uppercase min-h-[32px] flex items-center justify-center px-1">
                    {prediction.namesA}
                  </div>
                  {Number(prediction.formA) > 0 && (
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
                <div className="text-5xl font-black text-white tracking-tighter">
                  {prediction.probB}%
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-bold text-zinc-300 leading-tight uppercase min-h-[32px] flex items-center justify-center px-1">
                    {prediction.namesB}
                  </div>
                  {Number(prediction.formB) > 0 && (
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
                <span
                  className={
                    Number(prediction.scoreA) > Number(prediction.scoreB)
                      ? 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                      : 'text-zinc-500'
                  }
                >
                  {prediction.scoreA}
                </span>
                <span className="text-zinc-800 text-3xl">-</span>
                <span
                  className={
                    Number(prediction.scoreB) > Number(prediction.scoreA)
                      ? 'text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                      : 'text-zinc-500'
                  }
                >
                  {prediction.scoreB}
                </span>
              </div>
              {prediction.isPoule && (
                <div className="mt-4 flex justify-center items-center gap-1.5">
                  <Clock size={10} className="text-zinc-600" />
                  <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">
                    Temps réglementaire 20'
                  </span>
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


