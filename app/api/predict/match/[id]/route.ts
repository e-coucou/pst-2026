import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalCDF } from '@/utils/probability';
import { predictMatch, getPreMatchSkillRating } from '@/utils/dynamic-prediction';

const VOLATILITY_PER_PLAYER = 150; // même valeur que PREDICTION_CONFIG.volatilityPerPlayer (PredictionModal)
const TOTAL_SIGMA = Math.sqrt(VOLATILITY_PER_PLAYER * VOLATILITY_PER_PLAYER * 2);
const ELO_INIT = 100;

async function getPreMatchModernElo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  playerId: number,
  gameId: number
): Promise<number> {
  const { data } = await supabase
    .from('elo_history')
    .select('elo_modern_value')
    .eq('player_id', playerId)
    .lt('game_id', gameId)
    .order('game_id', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.elo_modern_value ?? ELO_INIT;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (Number.isNaN(gameId)) {
    return NextResponse.json({ error: 'Identifiant de match invalide' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  }

  const { data: game } = await supabase
    .from('games')
    .select('id, year, type, poule, score_1, score_2, team_1_id, team_2_id')
    .eq('id', gameId)
    .single();

  if (!game) {
    return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
  }

  const { data: teams } = await supabase
    .from('teams')
    .select('id, tireur_id, pointeur_id')
    .in('id', [game.team_1_id, game.team_2_id]);
  const teamsMap = new Map((teams || []).map((t) => [t.id, t]));
  const team1 = teamsMap.get(game.team_1_id);
  const team2 = teamsMap.get(game.team_2_id);

  if (!team1 || !team2) {
    return NextResponse.json({ error: 'Équipes introuvables' }, { status: 404 });
  }

  const playerIds = [team1.tireur_id, team1.pointeur_id, team2.tireur_id, team2.pointeur_id];
  const { data: profiles } = await supabase.from('profiles').select('id, nom').in('id', playerIds);
  const nameMap = new Map((profiles || []).map((p) => [p.id, p.nom]));

  const [skillT1a, skillT1b, skillT2a, skillT2b] = await Promise.all([
    getPreMatchSkillRating(supabase, team1.tireur_id, gameId),
    getPreMatchSkillRating(supabase, team1.pointeur_id, gameId),
    getPreMatchSkillRating(supabase, team2.tireur_id, gameId),
    getPreMatchSkillRating(supabase, team2.pointeur_id, gameId),
  ]);

  const [eloT1a, eloT1b, eloT2a, eloT2b] = await Promise.all([
    getPreMatchModernElo(supabase, team1.tireur_id, gameId),
    getPreMatchModernElo(supabase, team1.pointeur_id, gameId),
    getPreMatchModernElo(supabase, team2.tireur_id, gameId),
    getPreMatchModernElo(supabase, team2.pointeur_id, gameId),
  ]);

  const dynamic = predictMatch([skillT1a, skillT1b], [skillT2a, skillT2b]);

  const muA = (eloT1a + eloT1b) / 2;
  const muB = (eloT2a + eloT2b) / 2;
  const modernProbA = normalCDF(0, 1, (muA - muB) / TOTAL_SIGMA);

  const actualWinner = game.score_1 === game.score_2 ? 'draw' : game.score_1 > game.score_2 ? 'team1' : 'team2';

  return NextResponse.json({
    game: { id: game.id, year: game.year, type: game.type, poule: game.poule, score1: game.score_1, score2: game.score_2 },
    team1: { tireur: nameMap.get(team1.tireur_id) ?? '?', pointeur: nameMap.get(team1.pointeur_id) ?? '?' },
    team2: { tireur: nameMap.get(team2.tireur_id) ?? '?', pointeur: nameMap.get(team2.pointeur_id) ?? '?' },
    modern: { probA: modernProbA, probB: 1 - modernProbA },
    dynamic: { probA: dynamic.probA, probB: dynamic.probB, probDraw: dynamic.probDraw },
    actualWinner,
  });
}
