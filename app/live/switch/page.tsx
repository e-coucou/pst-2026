'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminEntryPoint() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function redirectByStatus() {
      try {
        // 1. Récupérer le statut du tournoi
        const { data: tournoi, error: dbError } = await supabase
          .from('live_tournament')
          .select('status')
          .eq('id', 1)
          .single();

        if (dbError || !tournoi) {
          setError("Impossible de récupérer l'état du tournoi.");
          return;
        }

        // 2. Redirection logique
        // On utilise router.replace pour que l'utilisateur ne puisse pas 
        // revenir sur cette page "vide" en faisant 'Précédent'
        switch (tournoi.status) {
          case 'PREPARATION':
          case 'JOUEURS':
          case 'EQUIPES':
            // Si on est au début, on peut imaginer une page de config initiale
            // ou rester ici si tu as un menu de gestion
            router.replace('/live/admin'); 
            break;
          case 'POULES':
            router.replace('/live/poules');
            break;
          case 'DEMI':
            router.replace('/live/demi');
            break;
          case 'FINALE':
            router.replace('/live/finale');
            break;
          case 'TERMINE':
            router.replace('/live/podium');
            break;
          default:
            setError("Statut du tournoi inconnu.");
        }
      } catch (e) {
        setError("Une erreur inattendue est survenue.");
      }
    }

    redirectByStatus();
  }, [router, supabase]);

  // Affichage pendant la redirection éclair
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
      {!error ? (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <ShieldCheck size={48} className="text-red-600 animate-pulse" />
            <Loader2 size={48} className="absolute top-0 left-0 animate-spin text-red-600 opacity-30" />
          </div>
          <div className="text-center">
            <h2 className="font-black uppercase italic tracking-tighter text-xl">
              Analyse du <span className="text-red-600">Statut</span>
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
              Redirection vers l'étape en cours...
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 bg-red-600/10 border border-red-600/20 p-8 rounded-3xl">
          <AlertCircle size={40} className="text-red-600" />
          <p className="font-bold text-sm uppercase">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded-full"
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}
