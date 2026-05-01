// utils/live-stats.ts

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
