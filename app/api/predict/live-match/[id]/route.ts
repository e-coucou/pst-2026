import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalCDF } from '@/utils/probability';
import { predictMatch } from '@/utils/dynamic-prediction';
import { CLASSIC_SIGMA, MODERN_SIGMA } from '@/utils/model-config';
import type { Rating } from 'openskill';

// Équivalent de /api/predict/match/[id], mais pour un match du tournoi EN COURS (table
// live_matches/live_teams, pas games/teams archivées). Contrairement à l'archive, pas besoin de
// reconstituer un état "avant ce match précis" via l'historique : live_teams fige déjà l'ELO/le
// skill de chaque équipe à la FORMATION de la doublette (elo_start_*/modern_start/skill_mu_*),
// valable pour tous les matchs de la journée (les poules peuvent se jouer en parallèle sur
// plusieurs terrains — pas de chaînage séquentiel intra-tournoi possible, cf.
// utils/elo-logic.ts#updateMatchScore). modern_start est déjà une moyenne d'équipe (pas de
// version par joueur côté live) — contrairement à Classic et Dynamique.

const SKILL_MU_INIT = 25;
const SKILL_SIGMA_INIT = 25 / 3;

function toRating(mu: number | null, sigma: number | null): Rating {
  return { mu: mu ?? SKILL_MU_INIT, sigma: sigma ?? SKILL_SIGMA_INIT };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const matchId = parseInt(id, 10);
  if (Number.isNaN(matchId)) {
    return NextResponse.json({ error: 'Identifiant de match invalide' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  }

  const { data: match } = await supabase
    .from('live_matches')
    .select('id, type, poule, status, score_team1, score_team2, team1_id, team2_id')
    .eq('id', matchId)
    .single();

  if (!match) {
    return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
  }
  if (match.status !== 'TERMINE') {
    return NextResponse.json({ error: 'Match pas encore terminé' }, { status: 400 });
  }

  const { data: teams } = await supabase
    .from('live_teams')
    .select('id, tireur_id, pointeur_id, elo_start_tireur, elo_start_pointeur, modern_start, skill_mu_tireur, skill_sigma_tireur, skill_mu_pointeur, skill_sigma_pointeur')
    .in('id', [match.team1_id, match.team2_id]);
  const teamsMap = new Map((teams || []).map((t) => [t.id, t]));
  const team1 = teamsMap.get(match.team1_id);
  const team2 = teamsMap.get(match.team2_id);

  if (!team1 || !team2) {
    return NextResponse.json({ error: 'Équipes introuvables' }, { status: 404 });
  }

  const playerIds = [team1.tireur_id, team1.pointeur_id, team2.tireur_id, team2.pointeur_id];
  const { data: profiles } = await supabase.from('profiles').select('id, nom').in('id', playerIds);
  const nameMap = new Map((profiles || []).map((p) => [p.id, p.nom]));

  const classicProbA = normalCDF(
    0, 1,
    ((team1.elo_start_tireur + team1.elo_start_pointeur) / 2 - (team2.elo_start_tireur + team2.elo_start_pointeur) / 2) / CLASSIC_SIGMA
  );
  // modern_start est déjà une moyenne d'équipe côté live — pas de moyenne à refaire ici.
  const modernProbA = normalCDF(0, 1, (team1.modern_start - team2.modern_start) / MODERN_SIGMA);

  const dynamic = predictMatch(
    [toRating(team1.skill_mu_tireur, team1.skill_sigma_tireur), toRating(team1.skill_mu_pointeur, team1.skill_sigma_pointeur)],
    [toRating(team2.skill_mu_tireur, team2.skill_sigma_tireur), toRating(team2.skill_mu_pointeur, team2.skill_sigma_pointeur)]
  );

  const actualWinner = match.score_team1 === match.score_team2 ? 'draw' : match.score_team1 > match.score_team2 ? 'team1' : 'team2';

  return NextResponse.json({
    game: { id: match.id, year: null, type: match.type, poule: match.poule, score1: match.score_team1, score2: match.score_team2 },
    team1: { tireur: nameMap.get(team1.tireur_id) ?? '?', pointeur: nameMap.get(team1.pointeur_id) ?? '?' },
    team2: { tireur: nameMap.get(team2.tireur_id) ?? '?', pointeur: nameMap.get(team2.pointeur_id) ?? '?' },
    classic: { probA: classicProbA, probB: 1 - classicProbA },
    modern: { probA: modernProbA, probB: 1 - modernProbA },
    dynamic: { probA: dynamic.probA, probB: dynamic.probB, probDraw: dynamic.probDraw },
    actualWinner,
  });
}
