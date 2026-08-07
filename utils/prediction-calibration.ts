import { normalCDF } from '@/utils/probability';

// Calibration a posteriori du moteur ELO : rejoue, pour chaque match archivé, la probabilité de
// victoire qu'aurait donnée le cœur du modèle de PredictionModal.tsx (ELO Modern + CDF normale),
// puis compare aux résultats réels. Version DÉLIBÉRÉMENT SIMPLIFIÉE par rapport au module de
// prédiction live : pas de bonus de forme du jour (repose sur live_matches, non disponible pour
// les matchs déjà archivés), pas de facteur d'explosivité, pas de marge de nul spécifique aux
// poules — uniquement le calcul central (diffMu / sigma → CDF normale) appliqué uniformément à
// tous les types de match. Sert à vérifier que l'écart d'ELO Modern est un signal fiable, pas à
// auditer chaque réglage du module live.

const VOLATILITY_PER_PLAYER = 150; // même valeur que PREDICTION_CONFIG.volatilityPerPlayer
const TOTAL_SIGMA = Math.sqrt(VOLATILITY_PER_PLAYER * VOLATILITY_PER_PLAYER * 2);
const ELO_INIT = 100; // même valeur par défaut que le reste de l'app pour un joueur sans historique

interface GameRow {
  id: number;
  team_1_id: number;
  team_2_id: number;
  score_1: number;
  score_2: number;
}

interface TeamRow {
  id: number;
  tireur_id: number;
  pointeur_id: number;
}

interface EloHistoryRow {
  player_id: number;
  game_id: number;
  elo_modern_value: number;
}

export interface CalibrationBucket {
  predictedMid: number; // centre de la tranche de probabilité prédite (5, 15, ..., 95)
  actualRate: number | null; // taux de victoire réel observé dans cette tranche (%), null si vide
  count: number;
}

export interface CalibrationResult {
  buckets: CalibrationBucket[];
  accuracy: number; // % de matchs (hors nuls) où le favori désigné a effectivement gagné
  brierScore: number; // 0 = parfait, 0.25 = équivalent à toujours prédire 50/50
  totalMatches: number;
}

export function computeCalibration(
  games: GameRow[],
  teams: TeamRow[],
  eloHistory: EloHistoryRow[]
): CalibrationResult {
  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  // Pour chaque joueur, l'ELO Modern AVANT chaque match qu'il a joué = la valeur APRÈS son match
  // précédent (elo_history stocke la valeur post-match), ou ELO_INIT pour son tout premier match.
  const byPlayer = new Map<number, EloHistoryRow[]>();
  eloHistory.forEach((r) => {
    if (!byPlayer.has(r.player_id)) byPlayer.set(r.player_id, []);
    byPlayer.get(r.player_id)!.push(r);
  });

  const preMatchElo = new Map<string, number>();
  byPlayer.forEach((rows, playerId) => {
    const sorted = [...rows].sort((a, b) => a.game_id - b.game_id);
    sorted.forEach((row, idx) => {
      const before = idx === 0 ? ELO_INIT : sorted[idx - 1].elo_modern_value;
      preMatchElo.set(`${playerId}-${row.game_id}`, before);
    });
  });

  const bucketCount = 10;
  const sums = new Array(bucketCount).fill(0);
  const counts = new Array(bucketCount).fill(0);

  let correct = 0;
  let scored = 0;
  let brierSum = 0;
  let totalMatches = 0;

  games.forEach((g) => {
    const team1 = teamsMap.get(g.team_1_id);
    const team2 = teamsMap.get(g.team_2_id);
    if (!team1 || !team2) return;

    const e1a = preMatchElo.get(`${team1.tireur_id}-${g.id}`);
    const e1b = preMatchElo.get(`${team1.pointeur_id}-${g.id}`);
    const e2a = preMatchElo.get(`${team2.tireur_id}-${g.id}`);
    const e2b = preMatchElo.get(`${team2.pointeur_id}-${g.id}`);
    if (e1a == null || e1b == null || e2a == null || e2b == null) return;

    const muA = (e1a + e1b) / 2;
    const muB = (e2a + e2b) / 2;
    const probA = normalCDF(0, 1, (muA - muB) / TOTAL_SIGMA);

    const actual = g.score_1 === g.score_2 ? 0.5 : g.score_1 > g.score_2 ? 1 : 0;

    totalMatches += 1;
    brierSum += (probA - actual) ** 2;

    if (actual !== 0.5) {
      scored += 1;
      const favoriteWon = (probA >= 0.5 && actual === 1) || (probA < 0.5 && actual === 0);
      if (favoriteWon) correct += 1;
    }

    const bucketIdx = Math.min(bucketCount - 1, Math.floor((probA * 100) / 10));
    sums[bucketIdx] += actual;
    counts[bucketIdx] += 1;
  });

  const buckets: CalibrationBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
    predictedMid: i * 10 + 5,
    actualRate: counts[i] > 0 ? (sums[i] / counts[i]) * 100 : null,
    count: counts[i],
  }));

  return {
    buckets,
    accuracy: scored > 0 ? (correct / scored) * 100 : 0,
    brierScore: totalMatches > 0 ? brierSum / totalMatches : 0,
    totalMatches,
  };
}
