import { predictWin, predictDraw, type Rating } from 'openskill';
import type { SupabaseClient } from '@supabase/supabase-js';

// Prédiction a posteriori d'un match précis à partir du modèle Dynamique (openskill) — même
// moteur que la comparaison de calibration (utils/prediction-calibration.ts), mais ciblé sur un
// seul match plutôt que rejoué sur tout l'historique. Centralise l'appel à predictWin/predictDraw
// pour ne pas disperser les options du modèle dans chaque appelant.

const SKILL_MU_INIT = 25; // défauts openskill (rating() sans argument), cf. lib/elo-engine.ts
const SKILL_SIGMA_INIT = 25 / 3;

export interface MatchPrediction {
  probA: number; // probabilité de victoire de l'équipe 1
  probB: number; // probabilité de victoire de l'équipe 2
  probDraw: number;
}

export function predictMatch(team1: [Rating, Rating], team2: [Rating, Rating]): MatchPrediction {
  const [probA, probB] = predictWin([team1, team2]);
  const probDraw = predictDraw([team1, team2]);
  return { probA, probB, probDraw };
}

// Reconstitue l'état skill_mu/skill_sigma d'un joueur JUSTE AVANT un match donné : la ligne
// elo_history la plus récente avec game_id < gameId (elo_history stocke l'état post-match), ou
// les valeurs par défaut d'openskill si le joueur n'a encore aucun match antérieur enregistré.
export async function getPreMatchSkillRating(
  supabase: SupabaseClient,
  playerId: number,
  gameId: number
): Promise<Rating> {
  const { data } = await supabase
    .from('elo_history')
    .select('skill_mu, skill_sigma')
    .eq('player_id', playerId)
    .lt('game_id', gameId)
    .order('game_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? { mu: data.skill_mu, sigma: data.skill_sigma } : { mu: SKILL_MU_INIT, sigma: SKILL_SIGMA_INIT };
}
