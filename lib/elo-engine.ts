import { rating, rate, ordinal, type Rating } from 'openskill';

export type { Rating };

export interface EloSettings {
  elo_init: number;
  bonus_point: number;
  bonus_seuil: number;
  seuil: number;
  max_ecart: number;
  poids_finale: number;
  poids_finaliste: number;
  k_factor: number;
}

/**
 * MÉTHODE 1 : PST CLASSIC (Inspirée IRB Rugby)
 * Basée sur ton code joueur.js
 */
export function calculatePstElo(
  elo1: number, 
  elo2: number, 
  score1: number, 
  score2: number, 
  type: string,
  s: EloSettings
) {
  let D = elo1 - elo2;
  // Plafonnement de l'écart selon tes params
  D = Math.min(s.max_ecart, Math.max(-s.max_ecart, D));
  
  let multiplier = 1.0;
  // Gestion des coefficients de match
  if (type.includes("Finale")) multiplier = s.poids_finale;
  else if (type.includes("Demi")) multiplier = s.poids_finaliste; // ton param 'finaliste'

  // Bonus si gros écart de score (Fessée)
  const ecartScore = Math.abs(score1 - score2);
  if (ecartScore > s.bonus_seuil) multiplier *= s.bonus_point;

  let gain = 0;
  if (score1 > score2) {
    gain = (1 - (D / s.seuil)) * multiplier;
  } else if (score1 < score2) {
    gain = (-1 - (D / s.seuil)) * multiplier;
  } else {
    gain = (-D / s.seuil) * multiplier;
  }
  return gain;
}

/**
 * MÉTHODE 2 : MODERNE (ELO FIDE / Probabiliste)
 */
export function calculateModernElo(elo1: number, elo2: number, score1: number, score2: number, K = 32) {
  const expected1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));
  let actual1 = 0.5;
  if (score1 > score2) actual1 = 1;
  else if (score1 < score2) actual1 = 0;

  return K * (actual1 - expected1);
}

/**
 * MÉTHODE 3 : DYNAMIQUE (bayésien, openskill/Weng-Lin)
 *
 * Contrairement aux deux méthodes précédentes (échange de points scalaire par équipe), ce
 * modèle suit un état (mu = niveau estimé, sigma = incertitude) par JOUEUR et met à jour les
 * deux coéquipiers individuellement — un joueur très incertain (peu d'historique) bouge plus
 * qu'un partenaire déjà bien établi sur le même match. Pensé pour peu de matchs/saison et des
 * doublettes qui changent chaque année (cf. documents/architecture.md, plan de session associé).
 *
 * Basé sur le classement (victoire/nul/défaite), pas sur l'écart de score — pas d'équivalent
 * natif aux coefficients poids_finale/poids_finaliste de PST Classic pour cette v1.
 */
export function makeSkillRating(mu?: number, sigma?: number): Rating {
  return mu !== undefined && sigma !== undefined ? rating({ mu, sigma }) : rating();
}

export function skillOrdinal(r: Rating): number {
  return ordinal(r);
}

export function calculateSkillRating(
  team1: [Rating, Rating],
  team2: [Rating, Rating],
  score1: number,
  score2: number
): { team1: [Rating, Rating]; team2: [Rating, Rating] } {
  const rank: [number, number] =
    score1 > score2 ? [1, 2] : score1 < score2 ? [2, 1] : [1, 1];

  const [updatedTeam1, updatedTeam2] = rate([team1, team2], { rank });
  return {
    team1: updatedTeam1 as [Rating, Rating],
    team2: updatedTeam2 as [Rating, Rating],
  };
}
