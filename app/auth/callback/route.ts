import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  
  if (code) {
    const supabase = await createClient();
    // C'est cette ligne qui transforme le code Google en session réelle
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
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