import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server'; // IMPORTATION SERVEUR

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. On récupère l'utilisateur via la session serveur
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // S'il n'y a pas d'utilisateur ou une erreur, redirection immédiate
  if (authError || !user) {
    redirect('/live');
  }

  // 2. On appelle ton RPC 'get_my_role' (Côté serveur)
  const { data: role, error: rpcError } = await supabase.rpc('get_my_role');

  // 3. Logique de protection
  // Si erreur RPC ou si le rôle n'est pas admin/super
  const authorizedRoles = ['admin', 'super'];
  
  if (rpcError || !role || !authorizedRoles.includes(role)) {
    console.log("Accès refusé. Rôle détecté :", role);
    redirect('/live'); // On le renvoie vers la page publique
  }

  // 4. Si tout est OK, on affiche la page demandée
  return <>{children}</>;
}
