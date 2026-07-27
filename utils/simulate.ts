import { updateMatchScore } from '@/utils/elo-logic';

// Génère un score de pétanque plausible : un gagnant tiré au hasard à 13, l'autre équipe
// reçoit un score aléatoire entre 0 et 12.
const randomPetanqueScore = (): [number, number] => {
  const loser = Math.floor(Math.random() * 13);
  return Math.random() < 0.5 ? [13, loser] : [loser, 13];
};

/**
 * Simule et sauvegarde des scores aléatoires pour tous les matchs non terminés fournis, en
 * réutilisant updateMatchScore (même pipeline ELO que la saisie manuelle). Outil de test
 * réservé aux super admins (cf. useIsSuper) — utilisable plusieurs fois de suite (poules puis
 * demis puis finale, ou ronde après ronde) pour observer l'évolution des classements.
 */
export const simulateRandomScores = async (
  supabase: any,
  matches: any[],
  eloSettings: any
): Promise<any[]> => {
  const pending = matches.filter(m => m.status !== 'TERMINE');
  const updated: any[] = [];
  for (const m of pending) {
    const [score1, score2] = randomPetanqueScore();
    const result = await updateMatchScore(supabase, m.id, score1, score2, eloSettings);
    updated.push(result);
  }
  return updated;
};
