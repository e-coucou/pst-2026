import { createClient } from '@/utils/supabase/server';

// Récupère le joueur favori de l'utilisateur COURANT (site_users.favoris), pour les Server
// Components. Retourne null si non connecté ou aucun favori défini.
export async function getFavoriId(): Promise<number | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('site_users').select('favoris').eq('id', user.id).single();
  return data?.favoris ?? null;
}
