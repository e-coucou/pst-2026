import type { SupabaseClient } from '@supabase/supabase-js';

// Calcule l'historique des confrontations directes entre deux joueurs (A contre B), à partir
// des lignes elo_history du joueur A dont l'équipe adverse (tireur_id/pointeur_id) contient B —
// voir app/joueurs/face-a-face/page.tsx pour le détail de cette lecture des données. Factorisé
// ici pour être réutilisé par la page et par la génération de la carte partageable
// (app/api/card/face-a-face/route.tsx), qui ont besoin exactement du même calcul.

export interface Confrontation {
  gameId: number;
  year: number;
  type: string;
  poule: string | null;
  scorePour: number;
  scoreContre: number;
  result: number; // 1 victoire / -1 défaite / 0 nul (du point de vue du joueur A)
  partnerName: string | null;
  opponentPartnerName: string | null;
}

export interface HeadToHeadSummary {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  pointsPour: number;
  pointsContre: number;
}

export async function computeHeadToHead(
  supabase: SupabaseClient,
  aId: number,
  bId: number
): Promise<{ confrontations: Confrontation[]; summary: HeadToHeadSummary | null }> {
  const { data: rows } = await supabase
    .from('elo_history')
    .select('*')
    .eq('player_id', aId)
    .or(`tireur_id.eq.${bId},pointeur_id.eq.${bId}`)
    .order('game_id', { ascending: false });

  if (!rows || rows.length === 0) {
    return { confrontations: [], summary: null };
  }

  const { data: profiles } = await supabase.from('profiles').select('id, nom');
  const nameMap = new Map((profiles || []).map((p) => [p.id, p.nom]));

  const gameIds = rows.map((r) => r.game_id);
  const { data: games } = await supabase.from('games').select('id, team_1_id, team_2_id').in('id', gameIds);
  const gamesMap = new Map((games || []).map((g) => [g.id, g]));

  const teamIds = new Set<number>();
  (games || []).forEach((g) => { teamIds.add(g.team_1_id); teamIds.add(g.team_2_id); });
  const { data: teams } = await supabase.from('teams').select('id, tireur_id, pointeur_id').in('id', Array.from(teamIds));
  const teamsMap = new Map((teams || []).map((t) => [t.id, t]));

  const confrontations: Confrontation[] = rows.map((r) => {
    const game = gamesMap.get(r.game_id);
    let partnerName: string | null = null;
    if (game) {
      const candidates = [teamsMap.get(game.team_1_id), teamsMap.get(game.team_2_id)];
      const myTeam = candidates.find(t => t && (t.tireur_id === aId || t.pointeur_id === aId));
      if (myTeam) {
        const partnerId = myTeam.tireur_id === aId ? myTeam.pointeur_id : myTeam.tireur_id;
        partnerName = nameMap.get(partnerId) ?? null;
      }
    }

    const opponentIsTireur = r.tireur_id === bId;
    const opponentPartnerId = opponentIsTireur ? r.pointeur_id : r.tireur_id;
    const opponentPartnerName = nameMap.get(opponentPartnerId) ?? (opponentIsTireur ? r.pointeur : r.tireur) ?? null;

    return {
      gameId: r.game_id,
      year: r.year,
      type: r.type,
      poule: r.poule,
      scorePour: r.sc_p,
      scoreContre: r.sc_c,
      result: r.win,
      partnerName,
      opponentPartnerName,
    };
  });

  const summary: HeadToHeadSummary = {
    total: confrontations.length,
    wins: confrontations.filter(c => c.result === 1).length,
    losses: confrontations.filter(c => c.result === -1).length,
    draws: confrontations.filter(c => c.result === 0).length,
    pointsPour: confrontations.reduce((s, c) => s + c.scorePour, 0),
    pointsContre: confrontations.reduce((s, c) => s + c.scoreContre, 0),
  };

  return { confrontations, summary };
}
