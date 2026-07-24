import { SupabaseClient } from '@supabase/supabase-js';

// Fire-and-forget : ne doit jamais faire échouer l'action métier qui l'appelle.
export async function logActivity(
  supabase: SupabaseClient,
  actionType: string,
  metadata?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
