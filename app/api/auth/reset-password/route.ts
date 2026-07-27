import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Réinitialisation de mot de passe pour les comptes "pseudo" (email synthétique
// ${nickname}@pst.net, pas de vraie boîte mail donc pas de lien de reset possible).
// Vérification : le code d'invitation partagé (même RPC qu'à l'inscription), jamais
// fait confiance à ce qui vient du client — cf. app/auth/callback/route.ts.
export async function POST(request: Request) {
  try {
    const { nickname, invitationCode, newPassword } = await request.json();

    if (!nickname?.trim() || !invitationCode?.trim() || !newPassword) {
      return NextResponse.json({ success: false, error: "Champs manquants." }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères." }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Message générique volontaire pour code invalide ET pseudo introuvable, pour ne
    // pas laisser deviner quels pseudos existent.
    const genericError = () => NextResponse.json({ success: false, error: "Pseudo ou code invalide." }, { status: 400 });

    const { data: isValid, error: rpcError } = await admin.rpc('verify_invitation_code', {
      attempted_code: invitationCode.trim(),
    });
    if (rpcError || !isValid) return genericError();

    const targetEmail = `${nickname.toLowerCase().trim()}@pst.net`;

    // Pas de filtre email direct sur listUsers (SDK actuel) : un seul appel large
    // suffit largement vu la taille du club.
    const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;

    const user = usersPage.users.find(u => u.email?.toLowerCase() === targetEmail);
    if (!user) return genericError();

    const { error: updateError } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (updateError) throw updateError;

    await admin.from('session_logs').insert({
      user_id: user.id,
      player_nickname: nickname.trim().toLowerCase(),
      action: 'PASSWORD_RESET',
      details: 'Réinitialisation via code d\'invitation',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur reset-password:', error);
    return NextResponse.json({ success: false, error: "Une erreur est survenue." }, { status: 500 });
  }
}
