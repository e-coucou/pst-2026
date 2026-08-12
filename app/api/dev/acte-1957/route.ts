import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@/utils/supabase/server';

// Sert documents/Acte_1957_Etat_Descriptif_Division_Copropriete.md (acte notarié complet,
// converti en markdown) — contrairement à /api/dev/charte et /api/dev/todo (non sensibles),
// ce document reste réservé au rôle super, donc la vérification vit dans la route et pas
// seulement dans le layout.tsx de la page qui l'affiche.
export async function GET() {
  const supabase = await createClient();
  const { data: isSuper } = await supabase.rpc('is_super');
  if (!isSuper) {
    return NextResponse.json({ error: 'Accès réservé au rôle super' }, { status: 403 });
  }

  try {
    const filePath = path.join(process.cwd(), 'documents', 'Acte_1957_Etat_Descriptif_Division_Copropriete.md');
    const content = await fs.readFile(filePath, 'utf8');
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
  }
}
