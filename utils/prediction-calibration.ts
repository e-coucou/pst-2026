import { predictWin } from 'openskill';
import { normalCDF } from '@/utils/probability';

// Calibration a posteriori de DEUX moteurs de prédiction, rejoués sur chaque match archivé et
// comparés aux résultats réels :
// - "Modern" : cœur du modèle ELO Modern utilisé par PredictionModal.tsx (diffMu / sigma fixe →
//   CDF normale). Volatilité par joueur figée à 150 pour tout le monde (cf. commentaire "à
//   calibrer" dans PredictionModal.tsx).
// - "Dynamique" : predictWin() natif d'openskill, appliqué aux skill_mu/skill_sigma pré-match de
//   chaque joueur — contrairement à Modern, l'incertitude (sigma) est propre à chaque joueur
//   (élevée pour un joueur peu vu, faible pour un joueur établi), pas une constante globale.
//
// Les deux versions sont DÉLIBÉRÉMENT SIMPLIFIÉES par rapport au module de prédiction live : pas
// de bonus de forme du jour (repose sur live_matches, non disponible pour l'archive), pas de
// facteur d'explosivité, pas de marge de nul spécifique aux poules — sert à comparer objectivement
// les deux signaux d'écart de niveau, pas à auditer chaque réglage du module live.

const VOLATILITY_PER_PLAYER = 150; // même valeur que PREDICTION_CONFIG.volatilityPerPlayer
const TOTAL_SIGMA = Math.sqrt(VOLATILITY_PER_PLAYER * VOLATILITY_PER_PLAYER * 2);
const ELO_INIT = 100; // même valeur par défaut que le reste de l'app pour un joueur sans historique
const SKILL_MU_INIT = 25; // défauts openskill (rating() sans argument), mêmes que lib/elo-engine.ts
const SKILL_SIGMA_INIT = 25 / 3;

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
  skill_mu: number;
  skill_sigma: number;
}

export interface CalibrationBucket {
  predictedMid: number; // centre de la tranche de probabilité prédite (5, 15, ..., 95)
  actualRate: number | null; // taux de victoire réel observé dans cette tranche (%), null si vide
  count: number;
}

export interface CalibrationSeries {
  buckets: CalibrationBucket[];
  accuracy: number; // % de matchs (hors nuls) où le favori désigné a effectivement gagné
  brierScore: number; // 0 = parfait, 0.25 = équivalent à toujours prédire 50/50
}

export interface CalibrationResult {
  modern: CalibrationSeries;
  dynamic: CalibrationSeries;
  totalMatches: number;
}

// Pour chaque joueur, la valeur d'un champ AVANT chaque match qu'il a joué = la valeur du champ
// APRÈS son match précédent (elo_history stocke l'état post-match), ou `initial` pour son tout
// premier match. Générique pour être réutilisé sur un scalaire (elo_modern_value) comme sur une
// paire (skill_mu/skill_sigma) — voir buildPreMatchSkillLookup ci-dessous.
function buildPreMatchLookup<T>(
  eloHistory: EloHistoryRow[],
  extract: (row: EloHistoryRow) => T,
  initial: T
): Map<string, T> {
  const byPlayer = new Map<number, EloHistoryRow[]>();
  eloHistory.forEach((r) => {
    if (!byPlayer.has(r.player_id)) byPlayer.set(r.player_id, []);
    byPlayer.get(r.player_id)!.push(r);
  });

  const result = new Map<string, T>();
  byPlayer.forEach((rows, playerId) => {
    const sorted = [...rows].sort((a, b) => a.game_id - b.game_id);
    sorted.forEach((row, idx) => {
      const before = idx === 0 ? initial : extract(sorted[idx - 1]);
      result.set(`${playerId}-${row.game_id}`, before);
    });
  });

  return result;
}

// Accumule une série de calibration à partir d'une fonction qui calcule probA pour un match donné.
function accumulateSeries(
  games: GameRow[],
  teamsMap: Map<number, TeamRow>,
  computeProbA: (game: GameRow, team1: TeamRow, team2: TeamRow) => number | null
): CalibrationSeries {
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

    const probA = computeProbA(g, team1, team2);
    if (probA == null) return;

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
  };
}

export function computeCalibration(
  games: GameRow[],
  teams: TeamRow[],
  eloHistory: EloHistoryRow[]
): CalibrationResult {
  const teamsMap = new Map(teams.map((t) => [t.id, t]));

  const preMatchElo = buildPreMatchLookup(eloHistory, (r) => r.elo_modern_value, ELO_INIT);
  const preMatchSkill = buildPreMatchLookup(
    eloHistory,
    (r) => ({ mu: r.skill_mu, sigma: r.skill_sigma }),
    { mu: SKILL_MU_INIT, sigma: SKILL_SIGMA_INIT }
  );

  const modern = accumulateSeries(games, teamsMap, (g, team1, team2) => {
    const e1a = preMatchElo.get(`${team1.tireur_id}-${g.id}`);
    const e1b = preMatchElo.get(`${team1.pointeur_id}-${g.id}`);
    const e2a = preMatchElo.get(`${team2.tireur_id}-${g.id}`);
    const e2b = preMatchElo.get(`${team2.pointeur_id}-${g.id}`);
    if (e1a == null || e1b == null || e2a == null || e2b == null) return null;

    const muA = (e1a + e1b) / 2;
    const muB = (e2a + e2b) / 2;
    return normalCDF(0, 1, (muA - muB) / TOTAL_SIGMA);
  });

  const dynamic = accumulateSeries(games, teamsMap, (g, team1, team2) => {
    const r1a = preMatchSkill.get(`${team1.tireur_id}-${g.id}`);
    const r1b = preMatchSkill.get(`${team1.pointeur_id}-${g.id}`);
    const r2a = preMatchSkill.get(`${team2.tireur_id}-${g.id}`);
    const r2b = preMatchSkill.get(`${team2.pointeur_id}-${g.id}`);
    if (r1a == null || r1b == null || r2a == null || r2b == null) return null;

    const [probA] = predictWin([[r1a, r1b], [r2a, r2b]]);
    return probA;
  });

  return { modern, dynamic, totalMatches: games.length };
}
