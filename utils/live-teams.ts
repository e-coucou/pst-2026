// Helpers de constitution des équipes du tournoi live, extraits de app/live/(admin)/admin/page.tsx
// (logique pure, sans état ni appel Supabase — testable indépendamment de la page).

// --- HELPERS FORMAT DE TOURNOI ---
// 'classique' = 8 équipes / 2 poules de 4 (demies puis 4 finales)
// '10_equipes' = 10 équipes / 2 poules de 5 (pas de demies, 5 finales classées)
// 'ronde' = 10 équipes / système suisse (5 rondes, appariement par classement, pas de poules)
export const getRequiredCount = (format: string) => (format === 'classique' ? 8 : 10);
export const getTeamIds = (format: string) =>
  format === 'classique'
    ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const getGassinIds = (format: string) =>
  format === '10_equipes' ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'C', 'E', 'G'];

// Round-robin générique (méthode du cercle) : pour n équipes (pair ou impair, avec bye si
// impair), génère toutes les paires C(n,2) sans répétition. Vérifié à la main pour n=4 :
// reproduit exactement l'ancienne séquence figée [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]].
export const generateRoundRobinPairs = (n: number): [number, number][] => {
  const BYE = -1;
  const hasBye = n % 2 !== 0;
  const m = hasBye ? n + 1 : n;
  let arr: number[] = Array.from({ length: m }, (_, i) => (i < n ? i : BYE));
  const rounds: [number, number][][] = [];

  for (let r = 0; r < m - 1; r++) {
    const roundPairs: [number, number][] = [];
    for (let i = 0; i < m / 2; i++) {
      const a = arr[i];
      const b = arr[m - 1 - i];
      if (a !== BYE && b !== BYE) {
        roundPairs.push(a < b ? [a, b] : [b, a]);
      }
    }
    rounds.push(roundPairs);
    // Rotation : arr[0] fixe, le reste tourne (dernier élément passe en position 1)
    arr = [arr[0], arr[m - 1], ...arr.slice(1, m - 1)];
  }

  // Inversion de l'ordre des rounds (pas des paires à l'intérieur d'un round) : nécessaire
  // pour retomber exactement sur l'ordre legacy à n=4.
  return rounds.reverse().flat();
};

// Attribution des terrains (format 10_equipes, 2 poules de 5 équipes jouées EN PARALLÈLE sur les
// 4 mêmes terrains physiques : à chaque ronde, 2 matchs Gassin + 2 matchs Ramatuelle = 4 matchs
// simultanés, un par terrain — cf. generateRoundRobinPairs, même découpage en 5 rondes pour les
// deux poules). Avec seulement 4 terrains, il est mathématiquement impossible qu'une équipe joue
// une fois sur chacun (nombre chromatique d'arêtes de K5 = 5, vérifié par calcul exhaustif) :
// chaque équipe dispute 4 matchs et ne peut couvrir que 3 terrains distincts sur 4 au mieux.
// Tables figées ci-dessous = meilleure répartition conjointe trouvée par recherche (les 2 poules
// ne doivent jamais s'attribuer le même terrain à la même ronde) : les 10 équipes couvrent
// chacune au moins 3 terrains différents (une couvre les 4). Clé = paire d'index triée "i-j"
// dans le tableau local de la poule (0..4).
export const POULE5_COURTS: Record<'Gassin' | 'Ramatuelle', Record<string, string>> = {
  Gassin: {
    '0-1': 'T2', '0-2': 'T4', '0-3': 'T1', '0-4': 'T3',
    '1-2': 'T1', '1-3': 'T3', '1-4': 'T2',
    '2-3': 'T3', '2-4': 'T4',
    '3-4': 'T4',
  },
  Ramatuelle: {
    '0-1': 'T1', '0-2': 'T1', '0-3': 'T3', '0-4': 'T2',
    '1-2': 'T4', '1-3': 'T2', '1-4': 'T1',
    '2-3': 'T4', '2-4': 'T2',
    '3-4': 'T3',
  },
};

type EloPlayer = {
  id: number;
  nom: string;
  elo: number;
  modern: number;
  skillMu: number;
  skillSigma: number;
};

// Construit les lignes `live_teams` à partir des listes pointeurs/tireurs (même index = même
// équipe). Utilisée à la fois par `syncTeamsToDatabase` (sauvegarde continue du draft, upsert) et
// `confirmAndCreateTournament` (lancement, insert) dans admin/page.tsx — auparavant deux blocs
// dupliqués à garder synchronisés manuellement (cf. documents/architecture.md §6) ; toute future
// colonne à ajouter ne se modifie plus qu'ici.
export const buildTeamsPayload = (pList: EloPlayer[], tList: EloPlayer[], format: string) => {
  const teamIds = getTeamIds(format);
  const gassinIds = getGassinIds(format);
  return pList.map((p, i) => ({
    id: teamIds[i],
    tireur_id: tList[i].id,
    pointeur_id: p.id,
    elo_start: (tList[i].elo + p.elo) / 2,
    elo_start_pointeur: p.elo,
    elo_start_tireur: tList[i].elo,
    modern_start: (tList[i].modern + p.modern) / 2 || 100,
    // "Dynamique" : pas de moyenne d'équipe (contrairement à modern_start) — 4 colonnes
    // séparées, chaque joueur garde son propre mu/sigma au sein de la doublette.
    skill_mu_pointeur: p.skillMu,
    skill_sigma_pointeur: p.skillSigma,
    skill_mu_tireur: tList[i].skillMu,
    skill_sigma_tireur: tList[i].skillSigma,
    poule: format === 'ronde' ? 'Ronde' : (gassinIds.includes(teamIds[i]) ? 'Gassin' : 'Ramatuelle'),
  }));
};
