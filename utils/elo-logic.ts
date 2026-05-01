// utils/elo-logic.ts

import { calculatePstElo, calculateModernElo, EloSettings } from '@/lib/elo-engine';

/**
 * Interface pour les résultats d'un calcul de match
 */
export interface MatchImpact {
  deltaClassic: number;
  deltaModern: number;
}

/**
 * Calcule l'impact ELO d'un match pour l'équipe 1 (l'inverse s'applique à l'équipe 2)
 */
export function calculateMatchImpact(
  team1ClassicElo: number,
  team2ClassicElo: number,
  team1ModernElo: number,
  team2ModernElo: number,
  score1: number,
  score2: number,
  matchType: string,
  settings: EloSettings
): MatchImpact {
  
  // Calcul PST Classic (basé sur ton moteur existant)
  const deltaClassic = calculatePstElo(
    team1ClassicElo,
    team2ClassicElo,
    score1,
    score2,
    matchType,
    settings
  );

  // Calcul Modern (K-Factor)
  const deltaModern = calculateModernElo(
    team1ModernElo,
    team2ModernElo,
    score1,
    score2,
    settings.k_factor
  );

  return {
    deltaClassic,
    deltaModern
  };
}

/**
 * Formate les réglages depuis la table 'settings' de Supabase
 */
export function parseSettings(settingsData: any[]): EloSettings {
  const s: any = {};
  settingsData.forEach(item => s[item.key] = item.value);

  return {
    elo_init: Number(s.elo_init) || 1500,
    bonus_point: Number(s.bonus_point) || 1.1,
    bonus_seuil: Number(s.bonus_seuil) || 6,
    seuil: Number(s.seuil) || 10,
    max_ecart: Number(s.max_ecart) || 5,
    poids_finale: Number(s.poids_finale) || 1.25,
    poids_finaliste: Number(s.poids_finaliste) || 1.2,
    k_factor: Number(s.k_factor) || 20
  };
}


// Fonction centralisée pour sauvegarder un score et calculer les impacts ELO
export const updateMatchScore = async (
  supabase: any,
  matchId: number,
  score1: number,
  score2: number,
  eloSettings: any
) => {
  // 1. Récupérer les données du match et les ELO de départ
  const { data: match, error: fetchError } = await supabase
    .from('live_matches')
    .select(`
      *,
      team1:team1_id (elo_start, modern_start),
      team2:team2_id (elo_start, modern_start)
    `)
    .eq('id', matchId)
    .single();

  if (fetchError || !match) throw new Error("Match introuvable");

  // 2. Calculer le Delta
  // On utilise match.type qui contient 'Poule', 'Demi', ou 'Finale'
  const { deltaClassic, deltaModern } = calculateMatchImpact(
    match.team1.elo_start,
    match.team2.elo_start,
    match.team1.modern_start,
    match.team2.modern_start,
    score1,
    score2,
    match.type || 'Poule',
    eloSettings
  );

  // 3. Mettre à jour la base de données
  const { data: updatedMatch, error: updateError } = await supabase
    .from('live_matches')
    .update({
      score_team1: score1,
      score_team2: score2,
      delta_elo_team1: deltaClassic,
      delta_elo_team2: -deltaClassic,
      delta_modern_team1: deltaModern,
      delta_modern_team2: -deltaModern,
      status: 'TERMINE',
      updated_at: new Date().toISOString()
    })
    .eq('id', matchId)
    .select()
    .single();

  if (updateError) throw updateError;

  return updatedMatch; // On renvoie le match mis à jour pour l'état local
};
