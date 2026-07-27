import { updateMatchScore } from '@/utils/elo-logic';

// Transformée de Box-Muller : tirage suivant une loi normale (mean, stdDev).
const gaussianRandom = (mean: number, stdDev: number): number => {
  const u1 = Math.random() || Number.EPSILON;
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
};

// Mode "finale" (demis/finales, et dernière ronde du format Ronde) : un gagnant tiré au
// hasard à 13, l'autre équipe reçoit un score aléatoire entre 0 et 12 — jamais de nul, match
// toujours décisif.
const randomFinaleScore = (): [number, number] => {
  const loser = Math.floor(Math.random() * 13);
  return Math.random() < 0.5 ? [13, loser] : [loser, 13];
};

// Mode "poule" (poules classiques/10 équipes, rondes 1 à 4 du format Ronde) : les deux scores
// sont tirés indépendamment selon une gaussienne centrée sur 8 (écart-type 3), arrondis et
// bornés à [0, 13] — autorise des matchs qui ne vont pas jusqu'à 13 et des scores nuls (égalité),
// plus réaliste pour peupler des classements de test.
const clampScore = (n: number) => Math.min(13, Math.max(0, Math.round(n)));
const randomPouleScore = (): [number, number] => [
  clampScore(gaussianRandom(8, 3)),
  clampScore(gaussianRandom(8, 3))
];

/**
 * Simule et sauvegarde des scores aléatoires pour tous les matchs non terminés fournis, en
 * réutilisant updateMatchScore (même pipeline ELO que la saisie manuelle — les nuls sont déjà
 * gérés nativement par le moteur ELO et calculatePouleStandings). Outil de test réservé aux
 * super admins (cf. useIsSuper) — utilisable plusieurs fois de suite (poules puis demis puis
 * finale, ou ronde après ronde) pour observer l'évolution des classements.
 */
export const simulateRandomScores = async (
  supabase: any,
  matches: any[],
  eloSettings: any,
  mode: 'finale' | 'poule' = 'finale'
): Promise<any[]> => {
  const pending = matches.filter(m => m.status !== 'TERMINE');
  const updated: any[] = [];
  for (const m of pending) {
    const [score1, score2] = mode === 'poule' ? randomPouleScore() : randomFinaleScore();
    const result = await updateMatchScore(supabase, m.id, score1, score2, eloSettings);
    updated.push(result);
  }
  return updated;
};
