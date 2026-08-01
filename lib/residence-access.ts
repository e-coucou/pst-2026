import { createClient } from '@/utils/supabase/server';

// Un super a toujours accès, indépendamment de son palier stocké (souvent resté à 0,
// non pertinent pour ce rôle). Voir documents/architecture.md pour le modèle des paliers.
export async function hasResidenceAccess(minLevel: number): Promise<boolean> {
  const supabase = await createClient();
  const [{ data: isSuper }, { data: level }] = await Promise.all([
    supabase.rpc('is_super'),
    supabase.rpc('get_residence_access_level'),
  ]);
  return isSuper === true || (typeof level === 'number' && level >= minLevel);
}
