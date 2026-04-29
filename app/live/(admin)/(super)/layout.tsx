import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function SuperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. On appelle ton nouveau RPC 'is_super_admin'
  // On ne récupère pas le rôle, on demande juste : "Est-ce que je suis super ?"
  const { data: isSuper, error: rpcError } = await supabase.rpc('is_super');

  // 2. Logique de protection stricte
  if (rpcError || isSuper !== true) {
    console.log("Accès Super refusé.");
    // On le renvoie vers l'admin simple car il est déjà authentifié comme admin
    redirect('/'); 
  }

  // 3. Si c'est bien un super admin, on affiche la zone critique
  return <>{children}</>;
}
