import { createClient } from '@/utils/supabase/server';

export async function getPlayerProfile(playerId: number) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      *,
      elo_history!fk_elo_player (
        elo_value,
        elo_modern_value,
        year
      )
    `)
    .eq('id', playerId)
    .single();

  return { profile, error };
}
