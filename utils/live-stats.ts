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

  // Tri : points, puis goalaverage général (diff), puis points marqués (pour). Les égalités
  // strictes restantes sont ensuite départagées par goalaverage particulier (confrontation
  // directe entre les seules équipes encore à égalité) plutôt que laissées à l'ordre arbitraire.
  const primarySort = (a: PouleStanding, b: PouleStanding) =>
    (b.pts - a.pts) || (b.diff - a.diff) || (b.pour - a.pour);

  const sorted = [...standings].sort(primarySort);
  const result: PouleStanding[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && primarySort(sorted[i], sorted[j]) === 0) j++;
    const tiedGroup = sorted.slice(i, j);

    if (tiedGroup.length > 1) {
      const idsInGroup = new Set(tiedGroup.map(t => t.id));
      const h2hDiff = new Map<string, number>(tiedGroup.map(t => [t.id, 0]));
      pouleMatches
        .filter(m => idsInGroup.has(m.team1_id) && idsInGroup.has(m.team2_id))
        .forEach(m => {
          h2hDiff.set(m.team1_id, (h2hDiff.get(m.team1_id) || 0) + (m.score_team1 - m.score_team2));
          h2hDiff.set(m.team2_id, (h2hDiff.get(m.team2_id) || 0) + (m.score_team2 - m.score_team1));
        });
      tiedGroup.sort((a, b) => (h2hDiff.get(b.id) || 0) - (h2hDiff.get(a.id) || 0));
    }

    result.push(...tiedGroup);
    i = j;
  }

  return result;
};

/**
 * Clé normalisée (ordre alphabétique) pour identifier une paire d'équipes, indépendamment
 * de l'ordre team1/team2.
 */
const pairKey = (a: string, b: string) => [a, b].sort().join('-');

/**
 * Reconstruit l'ensemble des duels déjà joués (toutes rondes confondues) à partir des
 * matchs existants d'un format "Ronde", pour l'anti-rematch de generateRondePairing.
 */
export const buildPlayedPairs = (matches: any[]): Set<string> => {
  const played = new Set<string>();
  matches.forEach(m => played.add(pairKey(m.team1_id, m.team2_id)));
  return played;
};

/**
 * Appariement suisse glouton pour une ronde du format "Ronde" : à partir du classement
 * cumulé courant (déjà trié pts/diff/pour par calculatePouleStandings), apparie les équipes
 * par rang adjacent en évitant les rematchs. Pas de garantie d'optimalité façon FIDE (pas de
 * backtracking complet), mais suffisant pour 5 rondes / 10 équipes où le risque de blocage
 * est marginal — en cas de blocage, retombe sur le premier adversaire disponible (rematch).
 */
export const generateRondePairing = (
  standings: PouleStanding[],
  playedPairs: Set<string>
): [string, string][] => {
  const pool = [...standings];
  const pairs: [string, string][] = [];

  while (pool.length > 0) {
    const a = pool.shift()!;
    let idx = pool.findIndex(b => !playedPairs.has(pairKey(a.id, b.id)));
    if (idx === -1) idx = 0;
    const [b] = pool.splice(idx, 1);
    pairs.push([a.id, b.id]);
  }

  return pairs;
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
