import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    // C'est cette ligne qui transforme le code Google en session réelle
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Une fois connecté, on va sur /stats
      return NextResponse.redirect(`${origin}/stats`);
    }
  }

  // Si ça rate, on retourne au login avec un message
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}