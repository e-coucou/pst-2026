'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, X, Zap, TrendingUp, Target, Swords, Clock } from 'lucide-react';

// ============================================================================
// CONFIGURATION DU MODÈLE DE PRÉDICTION
// ============================================================================
const PREDICTION_CONFIG = {
  // Volatilité du modèle probabiliste (normal CDF)
  // À CALIBRER : calculer depuis l'historique des différences d'ELO observées
  // Placeholder : 150 est raisonnable mais doit être validé sur 6 ans de données
  volatilityPerPlayer: 150,

  // Bonus de forme : plafonnage et stabilisation
  formBonus: {
    maxDailyBonus: 40, // ±40 points max par jour
    coefficientPerPointDiff: 8, // points d'ELO par point de différence moyenne
    minGamesForReliability: 1, // Nombre minimum de matchs du jour pour appliquer le bonus
  },

  // Explosivité : variance de scoring (15 derniers matchs)
  explosivity: {
    historicalMatchesRequired: 15,
    minMatchesForValidCalculation: 5, // Si < 5, explosivity = 1.0 (neutre)
    normalizationFactor: 13, // Score max en pétanque
  },

  // Logique de Poule
  poule: {
    drawMargin: 20, // Écart en points pour calculer prob de nul
    maxScoreWhenDominating: 13,
    minScoreLossThreshold: 1, // Scores type 11-1 si super domination
  },

  // Calcul du ratio de domination
  domination: {
    // Formule linéaire simple et auditable (au lieu de l'exposant 0.6)
    // domination = min(2.0, max(0, ratio * 2.5))
    // Où ratio = (probWinner - 0.5) / 0.5
    maxDominationMultiplier: 2.5,
    maxDominationCap: 2.0,
  },
};

// ============================================================================
// OUTILS MATHÉMATIQUES DE PRÉCISION
// ============================================================================

/**
 * Approximation de la fonction d'erreur (erf) - Abramowitz & Stegun
 * Utilisée pour la CDF de la loi normale
 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1.0 / (1.0 + p * x);
  return sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
}

/**
 * CDF de la loi normale
 * P(X ≤ x) pour X ~ N(mean, stdDev²)
 * 
 * @param mean Moyenne
 * @param stdDev Écart-type
 * @param x Valeur à évaluer (défaut 0)
 * @returns Probabilité cumulative [0, 1]
 */
function normalCDF(mean: number, stdDev: number, x: number = 0): number {
  if (stdDev === 0) return x >= mean ? 1 : 0;
  const res = 0.5 * (1 + erf((x - mean) / (stdDev * Math.sqrt(2))));
  // Protection contre NaN
  return isNaN(res) ? 0.5 : Math.max(0, Math.min(1, res));
}

/**
 * Calcul du ratio de domination avec formule linéaire
 * Remplace l'exposant 0.6 par une interpolation simple et auditable
 * 
 * @param winProbability Probabilité du vainqueur prédit (0.5 à 1.0)
 * @param explosivityFactor Indice d'explosivité (1.0 = neutre)
 * @returns Ratio de domination [0, 2.0] qui module le score
 */
function calculateDominationRatio(winProbability: number, explosivityFactor: number): number {
  // ratio = (probWinner - 0.5) / 0.5 → normalise à [0, 1]
  const ratio = Math.max(0, (winProbability - 0.5) / 0.5);
  
  // Application linéaire simple (au lieu de ^0.6)
  // Si ratio=0 (50/50): domination=0 → peu d'écart
  // Si ratio=1 (100%): domination=2.0 → écart maximal
  const domination = Math.min(
    PREDICTION_CONFIG.domination.maxDominationCap,
    ratio * PREDICTION_CONFIG.domination.maxDominationMultiplier
  );

  return domination * explosivityFactor;
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
  const [debugInfo, setDebugInfo] = useState<any>(null); // Pour audit/logs

  const getPlayerName = (id: number) => playersMap[id] || `Joueur ${id}`;

  useEffect(() => {
    if (matchInfo) calculatePrediction();
  }, [matchInfo]);

  /**
   * Récupère les stats d'un joueur : ELO actuel, explosivité, bonus de forme
   * 
   * @param playerId ID du joueur
   * @param teamId ID de l'équipe (pour filtrer les matchs du jour)
   * @returns { mu, explosivity, formBonus, dataQuality }
   */
  const fetchPlayerStats = async (playerId: number, teamId: string) => {
    // 1. HISTORIQUE ELO & EXPLOSIVITÉ (Table elo_history)
    const { data: history } = await supabase
      .from('elo_history')
      .select('elo_modern_value, sc_p, sc_c')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(PREDICTION_CONFIG.explosivity.historicalMatchesRequired);

    // 2. FORME DU MOMENT (Table live_matches)
    const today = new Date().toISOString().split('T')[0];
    const { data: recentGames } = await supabase
      .from('live_matches')
      .select('score_team1, score_team2, team1_id, team2_id')
      .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
      .eq('status', 'TERMINE')
      .gte('updated_at', today);

    // 3. CALCUL DU BONUS DE FORME
    // Plafonnage et pondération par le nombre de matchs du jour
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
      
      // Calcul brut du bonus avec pondération par nombre de matchs
      const rawBonus = avgDiff * PREDICTION_CONFIG.formBonus.coefficientPerPointDiff;
      
      // Plafonnage
      formBonus = Math.max(
        -PREDICTION_CONFIG.formBonus.maxDailyBonus,
        Math.min(PREDICTION_CONFIG.formBonus.maxDailyBonus, rawBonus)
      );

      // Atténuation si peu de matchs (1-2 matchs = moins de confiance)
      if (nGamesToday < 3) {
        formBonus *= (nGamesToday / 3);
      }
    }

    // 4. ELO ACTUEL
    const lastElo = history?.[0]?.elo_modern_value ?? 1500;

    // 5. EXPLOSIVITÉ (variance des scores marqués)
    let explosivity = 1.0;
    let explosivityQuality = 'low'; // 'low', 'medium', 'high'
    
    const validScores = history?.filter((h) => h.sc_p !== null && h.sc_p !== undefined) ?? [];
    
    if (validScores.length >= PREDICTION_CONFIG.explosivity.minMatchesForValidCalculation) {
      const avg_p = validScores.reduce((acc, h) => acc + h.sc_p, 0) / validScores.length;
      const variance =
        validScores.reduce((acc, h) => acc + Math.pow(h.sc_p - avg_p, 2), 0) /
        validScores.length;
      
      explosivity = 1 + Math.sqrt(variance) / PREDICTION_CONFIG.explosivity.normalizationFactor;
      explosivity = isNaN(explosivity) ? 1.0 : explosivity;
      
      // Qualité basée sur nombre de matchs
      if (validScores.length >= 10) {
        explosivityQuality = 'high';
      } else if (validScores.length >= 5) {
        explosivityQuality = 'medium';
      }
    } else {
      // Moins de 5 matchs historiques → explosivity = 1.0 (neutre)
      explosivityQuality = 'low';
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

      // FETCH STATS POUR LES 4 JOUEURS
      const pointeurTeam1 = await fetchPlayerStats(t1.pointeur_id, t1.id);
      const tireurTeam1 = await fetchPlayerStats(t1.tireur_id, t1.id);
      const pointeurTeam2 = await fetchPlayerStats(t2.pointeur_id, t2.id);
      const tireurTeam2 = await fetchPlayerStats(t2.tireur_id, t2.id);

      // MOYENNE DES μ POUR CHAQUE ÉQUIPE
      // Approche simple : moyenne arithmétique des deux joueurs
      // (Alternative documentée : pondérer tireur/pointeur différemment, mais pas de donnée pour justifier)
      const muA = (pointeurTeam1.mu + tireurTeam1.mu) / 2;
      const muB = (pointeurTeam2.mu + tireurTeam2.mu) / 2;

      // EXPLOSIVITÉ MOYENNE DES 4 JOUEURS
      const avgExplosivity =
        (pointeurTeam1.explosivity +
          tireurTeam1.explosivity +
          pointeurTeam2.explosivity +
          tireurTeam2.explosivity) /
        4;

      // VOLATILITÉ DU MODÈLE
      // À CALIBRER : σ doit être ajusté sur l'historique réel
      // Calcul : √(σ₁² + σ₂²) = √(150² + 150²) ≈ 212.13
      const sigma_per_player = PREDICTION_CONFIG.volatilityPerPlayer;
      const totalSigma = Math.sqrt(sigma_per_player * sigma_per_player * 2);

      const diffMu = muA - muB;

      let probA = 0,
        probB = 0,
        probTie = 0;
      let scoreA = 0,
        scoreB = 0;

      if (isPoule) {
        // ===== LOGIQUE POULE (FORMAT 20') =====
        // Avec marge de nul pour augmenter volatilité
        const drawMargin = PREDICTION_CONFIG.poule.drawMargin;

        // P(B victoire) = CDF((-drawMargin - diffMu) / totalSigma)
        probB = normalCDF(0, 1, (-drawMargin - diffMu) / totalSigma);
        // P(A victoire) = 1 - CDF((drawMargin - diffMu) / totalSigma)
        probA = 1 - normalCDF(0, 1, (drawMargin - diffMu) / totalSigma);
        // P(Nul) = reste
        probTie = Math.max(0, 1 - (probA + probB));

        // SIMULATION DU SCORE
        if (probTie > probA && probTie > probB) {
          // Nul
          scoreA = 6;
          scoreB = 6;
        } else {
          const isAWinner = probA > probB;
          const winProb = isAWinner ? probA : probB;
          
          // Calcul de la domination (NEW: linéaire, pas ^0.6)
          const domination = calculateDominationRatio(winProb, avgExplosivity);

          // Score du vainqueur : entre 9 et 13
          const winnerScore = Math.min(
            PREDICTION_CONFIG.poule.maxScoreWhenDominating,
            9 + Math.round(domination * 4)
          );
          
          // Marge de victoire
          const margin = Math.round(domination * 12);

          if (isAWinner) {
            scoreA = winnerScore;
            scoreB = Math.max(0, scoreA - margin);
            // Scores extrêmes si très forte domination (ex: 11-1)
            if (domination > 0.75) {
              scoreB = Math.min(scoreB, PREDICTION_CONFIG.poule.minScoreLossThreshold);
            }
          } else {
            scoreB = winnerScore;
            scoreA = Math.max(0, scoreB - margin);
            if (domination > 0.75) {
              scoreA = Math.min(scoreA, PREDICTION_CONFIG.poule.minScoreLossThreshold);
            }
          }
        }
      } else {
        // ===== LOGIQUE ÉLIMINATOIRE (PREMIÈRE À 13) =====
        probA = normalCDF(0, 1, diffMu / totalSigma);
        probB = 1 - probA;

        const isAWinner = probA > 0.5;
        const winProb = isAWinner ? probA : probB;
        
        // Domination pour modifier le score du perdant
        const domination = calculateDominationRatio(winProb, avgExplosivity);

        if (isAWinner) {
          scoreA = 13;
          scoreB = Math.max(0, 13 - Math.round(domination * 12));
        } else {
          scoreB = 13;
          scoreA = Math.max(0, 13 - Math.round(domination * 12));
        }
      }

      // ===== CALCUL DE LA CONFIANCE / FIABILITÉ =====
      // Métrique HYBRIDE basée sur :
      // 1. Stabilité de l'historique (nombre de matchs par joueur)
      // 2. Qualité de l'explosivité (basée sur variance)
      // 3. Fiabilité du bonus de forme (nombre de matchs du jour)
      // 4. Clarté de la prédiction (écart entre probA et probB)

      const confidenceFactors = {
        // Facteur 1: Nombre minimum de matchs historiques parmi les 4 joueurs
        // Plus on a de données, plus on est confiant (0% → 100%)
        historicalDataReliability: Math.min(
          100,
          (Math.min(
            pointeurTeam1.nHistoricalMatches,
            tireurTeam1.nHistoricalMatches,
            pointeurTeam2.nHistoricalMatches,
            tireurTeam2.nHistoricalMatches
          ) / 20) * 100 // 20 matchs = 100% confiance
        ),

        // Facteur 2: Qualité de l'explosivité
        // high=100%, medium=70%, low=40%
        explosivityReliability: (() => {
          const qualities = [
            pointeurTeam1.explosivityQuality,
            tireurTeam1.explosivityQuality,
            pointeurTeam2.explosivityQuality,
            tireurTeam2.explosivityQuality,
          ].sort();
          const median = qualities[1]; // Médiane (2ème / 3ème sur 4)
          return {
            high: 100,
            medium: 70,
            low: 40,
          }[median] ?? 40;
        })(),

        // Facteur 3: Fiabilité du bonus de forme
        // Si 0 matchs du jour: 30%, Si 1: 60%, Si 2+: 90%
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

        // Facteur 4: Clarté de la prédiction
        // Plus l'écart probA-probB est grand, plus la prédiction est claire
        // 50/50 = 0%, 60/40 = 20%, 90/10 = 80%
        predictionClarity: Math.min(
          100,
          Math.abs(probA - probB) * 100 * 2
        ),
      };

      // Combine les facteurs (moyenne pondérée)
      const confidence = Math.round(
        (confidenceFactors.historicalDataReliability * 0.35 +
          confidenceFactors.explosivityReliability * 0.25 +
          confidenceFactors.formBonosReliability * 0.15 +
          confidenceFactors.predictionClarity * 0.25)
      );

      // DEBUG: Stockage des infos détaillées pour audit
      const debug = {
        muA,
        muB,
        diffMu,
        totalSigma,
        avgExplosivity,
        probAraw: (probA * 100).toFixed(1),
        probBraw: (probB * 100).toFixed(1),
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
        confidence: String(Math.min(98, confidence)), // Max 98% (jamais 100%)
      });

      setDebugInfo(debug);
      console.log('[PREDICTION DEBUG]', debug);
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
                Calcul de probabilité...
              </span>
              <span className="text-[9px] text-zinc-600">Analyse des moyennes de scores</span>
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
