import { createClient } from '@/utils/supabase/server';

/**
 * Vérifie si le code d'invitation est correct
 */
export async function verifyInvitationCode(codeSaisi: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'invitation_code')
    .single();

  if (error || !data) return false;
  return data.value.trim() === codeSaisi.trim();
}

/**
 * Vérifie si l'utilisateur actuel a le rôle admin ou super
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profiles } = await supabase
    .from('site_users')
    .select('role')
    .eq('id', user.id)
    .single();

  return profiles?.role === 'admin' || profiles?.role === 'super';
}
