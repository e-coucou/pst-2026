'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const finalizeLogin = async () => {
      // 1. Récupérer le code stocké avant le départ chez Google
      const pendingCode = localStorage.getItem('pending_invitation_code');

      // 2. Vérifier si on a une session active
      const { data: { session } } = await supabase.auth.getSession();

      if (session && pendingCode) {
        // 3. Mettre à jour les métadonnées de l'utilisateur avec le code
        await supabase.auth.updateUser({
          data: { invitation_code: pendingCode }
        });
        
        // 4. Nettoyer le localStorage
        localStorage.removeItem('pending_invitation_code');
      }

      // 5. Rediriger vers la page des stats (ou l'accueil)
      router.push('/stats');
    };

    finalizeLogin();
  }, [router, supabase]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-black italic animate-pulse">
      FINALISATION DE LA CONNEXION...
    </div>
  );
}