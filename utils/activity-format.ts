export const ACTION_LABELS: Record<string, string> = {
  ADMIN_SELECT_PLAYER: 'Sélection joueur',
  ADMIN_REMOVE_PLAYER: 'Retrait joueur',
  ADMIN_TOGGLE_CONFIRMED: 'Confirmation joueur',
  ADMIN_FINALIZE_TEAMS: 'Constitution des équipes',
  ADMIN_SHUFFLE_TEAMS: 'Mélange des équipes',
  ADMIN_START_TOURNAMENT: 'Lancement du tournoi',
  ADMIN_SAVE_SCORE: 'Saisie de score',
  ADMIN_UNLOCK_MATCH: 'Déverrouillage de match',
  ADMIN_GENERATE_DEMIS: 'Génération des demis',
  ADMIN_GENERATE_FINALS: 'Génération des finales',
  ADMIN_COMPLETE_TOURNAMENT: 'Fin du tournoi',
  FAVORITE_SET: 'Ajout favori',
  FAVORITE_UNSET: 'Retrait favori',
  PHOTO_UPLOAD: 'Import photo',
  PHOTO_VIEW: 'Photo consultée',
};

// Décrit la page consultée en langage lisible (nom du joueur au lieu de son id,
// onglet stats consulté, vidéo lue, etc.)
export function describePageView(metadata: Record<string, unknown> | null | undefined, playersMap: Record<number, string>): string {
  const path = (metadata?.path as string) || '';
  if (!path) return '';
  const [pathname] = path.split('?');
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return 'Accueil';

  if (segments[0] === 'joueurs' && segments[1]) {
    const id = parseInt(segments[1], 10);
    const nom = playersMap[id];
    return nom ? `Joueur : ${nom}` : `Joueur #${segments[1]}`;
  }

  if (segments[0] === 'tournois' && segments[1]) {
    return `Tournois ${segments[1]}`;
  }

  const BASE_LABELS: Record<string, string> = {
    tournois: 'Tournois',
    live: 'Live',
    classement: 'Classement',
    videos: 'Vidéos',
    render: 'Résidence',
    stats: 'Statistiques',
  };

  const base = BASE_LABELS[segments[0]] || segments[0];
  const extra = (metadata?.tab as string) || (metadata?.video as string) || undefined;
  const rest = extra ? [...segments.slice(1), extra].join(' · ') : segments.slice(1).join(' · ');
  return rest ? `${base} · ${rest}` : base;
}

// Formate le metadata d'une action : le player_id brut est remplacé par le nom
// du joueur (sauf si un champ 'nom' est déjà présent, pour éviter le doublon).
export function formatMetadata(metadata: Record<string, unknown> | null, playersMap: Record<number, string>): string {
  if (!metadata) return '';
  const hasNom = 'nom' in metadata;
  const entries: [string, unknown][] = [];

  for (const [k, v] of Object.entries(metadata)) {
    if (k === 'player_id') {
      if (hasNom) continue;
      entries.push(['joueur', playersMap[Number(v)] || `#${v}`]);
      continue;
    }
    entries.push([k, v]);
  }

  return entries.map(([k, v]) => `${k}=${v}`).join(' · ');
}

// Décrit une entrée du journal d'activité en une ligne lisible (utilisé pour
// l'affichage "qui fait quoi", ex: liste des connectés).
export function describeActivity(
  actionType: string,
  metadata: Record<string, unknown> | null,
  playersMap: Record<number, string>
): string {
  if (actionType === 'PAGE_VIEW') {
    return describePageView(metadata, playersMap);
  }
  return ACTION_LABELS[actionType] || actionType;
}
