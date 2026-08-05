import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';

// Export JSON complet des tables touchées par l'archivage/le passage de saison (voir
// documents/plan_archivage_saison.md §12) — filet de sécurité manuel, pas un vrai pg_dump
// (nécessiterait une connexion Postgres directe, indisponible côté Vercel/serverless). Pensé
// pour être téléchargé juste avant d'appeler archive_tournament ou surtout advance_to_next_season
// (seule action qui supprime réellement des données, via reset_tournament).
const BACKED_UP_TABLES = [
  'seasons',
  'teams',
  'games',
  'live_tournament',
  'live_teams',
  'live_matches',
  'live_selected',
  'live_history',
  'elo_history',
  'history_all',
  'steps',
  'settings',
] as const;

export async function POST() {
  try {
    // Contrairement à /api/admin/recompute-elo et /api/admin/live-elo (aucune vérification de
    // rôle), on vérifie explicitement `super` ici : cette route expose un export complet des
    // données de tournoi, plus sensible qu'un simple recalcul.
    const authClient = await createServerClient();
    const { data: isSuper } = await authClient.rpc('is_super');
    if (!isSuper) {
      return NextResponse.json({ success: false, error: 'Action réservée au rôle super' }, { status: 403 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const tables: Record<string, unknown> = {};
    for (const table of BACKED_UP_TABLES) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw new Error(`Échec lecture ${table} : ${error.message}`);
      tables[table] = data;
    }

    return NextResponse.json({
      success: true,
      generated_at: new Date().toISOString(),
      tables,
    });
  } catch (error: any) {
    console.error('Erreur API backup-tournament-data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
