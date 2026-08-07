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

// Même principe que computeMatchupMatrix, mais pour les COÉQUIPIERS (jamais adversaires) : pour
// chaque match, les deux membres de chaque équipe cumulent un "match joué ensemble", avec le
// résultat (victoire/défaite/nul) DE L'ÉQUIPE — contrairement à la matrice d'adversaires,
// wins/losses/draws sont donc symétriques ici (une victoire en duo est une victoire pour les
// deux joueurs). Alimente l'onglet "Duos" de /stats.
export async function computeTeammateMatrix(supabase: SupabaseClient): Promise<MatchupMatrix> {
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
    const draw = g.score_1 === g.score_2;
    [
      { team: teamsMap.get(g.team_1_id), won: g.score_1 > g.score_2 },
      { team: teamsMap.get(g.team_2_id), won: g.score_2 > g.score_1 },
    ].forEach(({ team, won }) => {
      if (!team) return;
      const { tireur_id: a, pointeur_id: b } = team;

      bump(a, b, 'matches');
      bump(b, a, 'matches');
      if (draw) {
        bump(a, b, 'draws');
        bump(b, a, 'draws');
      } else if (won) {
        bump(a, b, 'wins');
        bump(b, a, 'wins');
      } else {
        bump(a, b, 'losses');
        bump(b, a, 'losses');
      }
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

export interface DuoRanking {
  aId: number;
  bId: number;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winrate: number; // 0-100, victoires / (victoires + défaites), nuls exclus du ratio
}

// Classement des meilleurs duos par taux de victoire — un seuil minimum de matchs évite qu'une
// paire ayant joué 1 fois et gagné écrase le classement avec 100%.
export function rankBestDuos(matrix: MatchupMatrix, minMatches: number, limit?: number): DuoRanking[] {
  const seen = new Set<string>();
  const duos: DuoRanking[] = [];

  Object.entries(matrix).forEach(([aIdStr, row]) => {
    const aId = Number(aIdStr);
    Object.entries(row).forEach(([bIdStr, cell]) => {
      const bId = Number(bIdStr);
      const key = aId < bId ? `${aId}-${bId}` : `${bId}-${aId}`;
      if (seen.has(key) || cell.matches < minMatches) return;
      seen.add(key);

      const decisive = cell.wins + cell.losses;
      const winrate = decisive > 0 ? (cell.wins / decisive) * 100 : 0;
      duos.push({ aId, bId, matches: cell.matches, wins: cell.wins, losses: cell.losses, draws: cell.draws, winrate });
    });
  });

  duos.sort((x, y) => y.winrate - x.winrate || y.matches - x.matches);
  return limit ? duos.slice(0, limit) : duos;
}
