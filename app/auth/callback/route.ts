import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const invite = searchParams.get('invite');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    // C'est cette ligne qui transforme le code Google en session réelle
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Un compte OAuth est "nouveau" quand sa création et sa toute première
      // connexion sont simultanées (Supabase pose les deux timestamps dans le
      // même INSERT). Sur les connexions suivantes, last_sign_in_at avance seul.
      const isNewUser = data.user.created_at === data.user.last_sign_in_at;

      if (isNewUser) {
        // Client service-role : on ne fait pas confiance au localStorage / à ce
        // que le navigateur a pu envoyer, on revérifie le code ici, côté serveur.
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: isValid } = await admin.rpc('verify_invitation_code', {
          attempted_code: invite || '',
        });

        if (!isValid) {
          // Compte créé (par Google) sans code d'invitation valide : on annule.
          await admin.from('site_users').delete().eq('id', data.user.id);
          await admin.auth.admin.deleteUser(data.user.id);
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/signup?error=invite_required`);
        }
      }

      // --- LOG DE CONNEXION RÉUSSIE (GOOGLE) ---
      await supabase.from('session_logs').insert({
        user_id: data.user.id,
        player_nickname: data.user.user_metadata.full_name || data.user.email,
        action: 'LOGIN_GOOGLE_SUCCESS', // Style PST : Uppercase
        details: 'Connexion via Google OAuth réussie'
      });

      // Une fois connecté, on va sur / la page d'accueil.
      return NextResponse.redirect(`${origin}${next}`);
      //return NextResponse.redirect(`${origin}/`);
    }
  }

  // Si ça rate, on retourne au login avec un message
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
