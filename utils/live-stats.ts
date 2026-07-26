// utils/live-stats.ts

export interface PouleStanding {
  id: string;
  pName: string;
  tName: string;
  j: number;
  v: number;
  d: number;
  n: number;
  pts: number;
  pour: number;
  contre: number;
  diff: number;
}

/**
 * Classement d'une poule (V/D/N/Pts/Pour/Contre/Diff), à partir des matchs TERMINE de cette
 * poule. Centralisé ici pour que poules/finale/podium/live affichent tous exactement le même
 * tableau (même calcul, même tri) plutôt que 4 copies légèrement différentes.
 */
export const calculatePouleStandings = (
  pouleName: string,
  teams: any[],
  matches: any[],
  playersMap: Record<number, string>
): PouleStanding[] => {
  const pouleTeams = teams.filter(t => t.poule === pouleName);
  const pouleMatches = matches.filter(m => m.poule === pouleName && m.status === 'TERMINE');

  const standings: PouleStanding[] = pouleTeams.map(t => ({
    id: t.id,
    pName: playersMap[t.pointeur_id] || `ID:${t.pointeur_id}`,
    tName: playersMap[t.tireur_id] || `ID:${t.tireur_id}`,
    j: 0, v: 0, d: 0, n: 0, pts: 0, pour: 0, contre: 0, diff: 0
  }));

  pouleMatches.forEach(m => {
    const t1 = standings.find(s => s.id === m.team1_id);
    const t2 = standings.find(s => s.id === m.team2_id);
    if (t1 && t2) {
      t1.j++; t2.j++;
      t1.pour += m.score_team1; t1.contre += m.score_team2; t1.diff += (m.score_team1 - m.score_team2);
      t2.pour += m.score_team2; t2.contre += m.score_team1; t2.diff += (m.score_team2 - m.score_team1);
      if (m.score_team1 > m.score_team2) { t1.v++; t2.d++; t1.pts += 3; }
      else if (m.score_team2 > m.score_team1) { t2.v++; t1.d++; t2.pts += 3; }
      else { t1.n++; t2.n++; t1.pts += 1; t2.pts += 1; }
    }
  });

  return standings.sort((a, b) => (b.pts - a.pts) || (b.diff - a.diff) || (b.pour - a.pour));
};

export interface TeamStats {
  id: string;
  delta_elo: number;
  delta_modern: number;
}

/**
 * Calcule les deltas cumulés (Elo et Modern) pour toutes les équipes
 * à partir d'une liste de matches.
 */
export const calculateTeamsStats = (teams: any[], allMatches: any[]): TeamStats[] => {
  if (!teams || !allMatches) return [];

  return teams.map(team => {
    // On ne prend que les matches terminés concernant cette équipe
    const totals = allMatches
      .filter(m => m.status === 'TERMINE' && (m.team1_id === team.id || m.team2_id === team.id))
      .reduce((acc, m) => {
        const isT1 = m.team1_id === team.id;
        
        // Sécurité : conversion en Number au cas où la DB renvoie des strings
        const eloDelta = isT1 ? Number(m.delta_elo_team1 || 0) : Number(m.delta_elo_team2 || 0);
        const modernDelta = isT1 ? Number(m.delta_modern_team1 || 0) : Number(m.delta_modern_team2 || 0);

        return {
          elo: acc.elo + eloDelta,
          modern: acc.modern + modernDelta
        };
      }, { elo: 0, modern: 0 });

    return {
      id: team.id,
      delta_elo: totals.elo,
      delta_modern: totals.modern
    };
  });
};
