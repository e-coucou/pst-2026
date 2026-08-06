// Calcule les distinctions personnelles d'un joueur à partir de son historique elo_history
// (une ligne par match joué par CE joueur). Mêmes formules que playerStats dans
// app/(sections)/stats/page.tsx, mais scopées à un seul joueur pour la fiche profil.

export interface PlayerAchievementStats {
  matches: number;
  maxWinStreak: number;
  fannyGiven: number;
  clutchWins: number;
  tireurMatches: number;
  tireurWinrate: number;
  pointeurMatches: number;
  pointeurWinrate: number;
}

interface EloHistoryRow {
  win: number | string;
  sc_p: number | string;
  sc_c: number | string;
  role?: string | null;
}

export function computePlayerAchievements(eloHistory: EloHistoryRow[]): PlayerAchievementStats {
  let currentWinStreak = 0;
  let maxWinStreak = 0;
  let fannyGiven = 0;
  let clutchWins = 0;
  let tireurMatches = 0;
  let tireurWins = 0;
  let pointeurMatches = 0;
  let pointeurWins = 0;

  eloHistory.forEach(row => {
    const win = Number(row.win);
    const scP = Number(row.sc_p);
    const scC = Number(row.sc_c);
    const isWin = win === 1;

    if (isWin) {
      currentWinStreak += 1;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
    } else if (win === -1) {
      currentWinStreak = 0;
    }

    if (scP > 0 && scC === 0) fannyGiven += 1;
    if (isWin && scP === 13 && scC === 12) clutchWins += 1;

    const role = (row.role || '').toLowerCase();
    if (role === 'tireur') {
      tireurMatches += 1;
      if (isWin) tireurWins += 1;
    } else if (role === 'pointeur') {
      pointeurMatches += 1;
      if (isWin) pointeurWins += 1;
    }
  });

  return {
    matches: eloHistory.length,
    maxWinStreak,
    fannyGiven,
    clutchWins,
    tireurMatches,
    tireurWinrate: tireurMatches > 0 ? (tireurWins / tireurMatches) * 100 : 0,
    pointeurMatches,
    pointeurWinrate: pointeurMatches > 0 ? (pointeurWins / pointeurMatches) * 100 : 0,
  };
}
