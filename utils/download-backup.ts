// Déclenche /api/admin/backup-tournament-data et fait télécharger le résultat comme fichier
// JSON — filet de sécurité manuel avant archive_tournament/advance_to_next_season, voir
// documents/plan_archivage_saison.md §12.
export async function downloadTournamentBackup(): Promise<void> {
  const res = await fetch('/api/admin/backup-tournament-data', { method: 'POST' });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'Échec de la sauvegarde');
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `pst-backup-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
