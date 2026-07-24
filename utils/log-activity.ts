import { SupabaseClient } from '@supabase/supabase-js';

// Cache en mémoire (par session d'onglet) pour éviter une requête "role" à chaque appel.
let cachedRole: { userId: string; role: string | null } | null = null;

async function getCurrentUserRole(supabase: SupabaseClient, userId: string): Promise<string | null> {
  if (cachedRole && cachedRole.userId === userId) return cachedRole.role;
  const { data } = await supabase.from('site_users').select('role').eq('id', userId).single();
  const role = data?.role ?? null;
  cachedRole = { userId, role };
  return role;
}

// Fire-and-forget : ne doit jamais faire échouer l'action métier qui l'appelle.
export async function logActivity(
  supabase: SupabaseClient,
  actionType: string,
  metadata?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // On n'enregistre pas l'activité des super-admins.
    const role = await getCurrentUserRole(supabase, user.id);
    if (role === 'super') return;

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      nickname: user.user_metadata?.nickname || user.user_metadata?.full_name || user.email,
      action_type: actionType,
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.error('logActivity a échoué:', e);
  }
}
