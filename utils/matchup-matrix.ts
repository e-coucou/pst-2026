import type { SupabaseClient } from '@supabase/supabase-js';

// Calcule, en un seul passage sur tous les matchs archivés, le bilan croisé de chaque paire de
// joueurs qui se sont affrontés (jamais coéquipiers) : nombre de matchs, victoires/défaites du
// point de vue du joueur "ligne", nuls. Un match 2v2 produit 4 confrontations (chaque joueur
// d'une équipe contre chaque joueur de l'équipe adverse). Alimente à la fois la matrice de
// /joueurs/face-a-face et le filtre "adversaires déjà affrontés" du sélecteur.

export interface MatchupCell {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
}

export type MatchupMatrix = Record<number, Record<number, MatchupCell>>;

export async function computeMatchupMatrix(supabase: SupabaseClient): Promise<MatchupMatrix> {
  const [{ data: games }, { data: teams }] = await Promise.all([
    supabase.from('games').select('team_1_id, team_2_id, score_1, score_2'),
    supabase.from('teams').select('id, tireur_id, pointeur_id'),
  ]);

  const teamsMap = new Map((teams || []).map((t) => [t.id, t]));
  const matrix: MatchupMatrix = {};

  const bump = (a: number, b: number, field: keyof MatchupCell) => {
    if (!matrix[a]) matrix[a] = {};
    if (!matrix[a][b]) matrix[a][b] = { matches: 0, wins: 0, losses: 0, draws: 0 };
    matrix[a][b][field] += 1;
  };

  (games || []).forEach((g) => {
    const team1 = teamsMap.get(g.team_1_id);
    const team2 = teamsMap.get(g.team_2_id);
    if (!team1 || !team2) return;

    const team1Players = [team1.tireur_id, team1.pointeur_id];
    const team2Players = [team2.tireur_id, team2.pointeur_id];
    const win1 = g.score_1 > g.score_2;
    const win2 = g.score_2 > g.score_1;

    team1Players.forEach((p1) => {
      team2Players.forEach((p2) => {
        bump(p1, p2, 'matches');
        bump(p2, p1, 'matches');
        if (win1) {
          bump(p1, p2, 'wins');
          bump(p2, p1, 'losses');
        } else if (win2) {
          bump(p1, p2, 'losses');
          bump(p2, p1, 'wins');
        } else {
          bump(p1, p2, 'draws');
          bump(p2, p1, 'draws');
        }
      });
    });
  });

  return matrix;
}

// Pour chaque joueur, la liste des adversaires qu'il a déjà affrontés au moins une fois —
// utilisée pour restreindre les options du sélecteur B une fois le joueur A choisi.
export function buildOpponentsByPlayer(matrix: MatchupMatrix): Record<number, number[]> {
  const result: Record<number, number[]> = {};
  Object.entries(matrix).forEach(([aId, row]) => {
    result[Number(aId)] = Object.keys(row).map(Number);
  });
  return result;
}

export interface PairRanking {
  aId: number;
  bId: number;
  matches: number;
}

// Classement des paires de joueurs qui se sont le plus affrontées — une seule entrée par
// paire (A,B) et (B,A) partagent le même nombre de matchs, donc dédupliquées ici.
export function rankMostFrequentPairs(matrix: MatchupMatrix, limit?: number): PairRanking[] {
  const seen = new Set<string>();
  const pairs: PairRanking[] = [];

  Object.entries(matrix).forEach(([aIdStr, row]) => {
    const aId = Number(aIdStr);
    Object.entries(row).forEach(([bIdStr, cell]) => {
      const bId = Number(bIdStr);
      const key = aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
      if (seen.has(key)) return;
      seen.add(key);
      pairs.push({ aId, bId, matches: cell.matches });
    });
  });

  pairs.sort((x, y) => y.matches - x.matches);
  return limit ? pairs.slice(0, limit) : pairs;
}
