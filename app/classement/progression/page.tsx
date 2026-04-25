import { createClient } from '@/utils/supabase/server';
import GlobalProgressionChart from '@/components/GlobalProgressionChart';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProgressionPage() {
  const supabase = await createClient();

  // On lance les deux requêtes en parallèle pour la performance
  const [timelineRes, profilesRes, seasons] = await Promise.all([
    supabase.rpc('get_full_timeline'),
    supabase.from('profiles').select('nom'),
    supabase.from('games').select('year') //.distinct() // Note: le support du .distinct() dépend de ta version de librairie.
  ]);

  const nbYears = seasons.data ? new Set(seasons.data.map(g => g.year)).size : 0;

  // Debug : Vérification du nombre de matchs récupérés (dans ta console terminal)
  if (timelineRes.data) {
    console.log(`[DEBUG] Timeline récupérée : ${timelineRes.data.length} matchs.`);
  }

  if (timelineRes.error) {
    console.error('[ERROR] Erreur RPC get_full_timeline:', timelineRes.error);
  }

  // Extraction sécurisée des données
  const timeline = timelineRes.data || [];
  const allPlayerNames = profilesRes.data?.map(p => p.nom).filter(Boolean) || [];

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
            ELO <span className="text-red-600">Evolution</span>
          </h1>
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-[0.5em] pl-1">
            Progression historique — {nbYears} Saisons — {timelineRes.data.length} Matchs
          </p>
        </header>

        {/* Container du Graphique */}
        <div className="relative h-[70vh] w-full bg-zinc-900/10 rounded-[3rem] border border-white/5 p-6 backdrop-blur-3xl overflow-hidden">
          {/* Effet de lueur en arrière-plan */}
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-red-600/5 blur-[120px] pointer-events-none" />
          
          <GlobalProgressionChart 
            timeline={timeline} 
            allPlayerNames={allPlayerNames} 
          />
        </div>

        {/* Footer info */}
        <footer className="flex justify-between items-center px-6">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Base de données</span>
              <span className="text-[10px] font-bold text-zinc-400">history_all</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Joueurs tracés</span>
              <span className="text-[10px] font-bold text-zinc-400">{allPlayerNames.length}</span>
            </div>
          </div>
          
          <div className="text-[8px] text-zinc-700 font-bold uppercase tracking-tighter">
            © 2026 PST Database Engine by eCoucou
          </div>
        </footer>
      </div>
    </main>
  );
}
