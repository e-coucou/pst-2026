import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Trophy, ArrowRight, ChevronLeft, Target, Zap } from 'lucide-react';

export default async function Leaderboard() {
  const supabase = await createClient();

  // 1. Récupération des données
  const [profilesRes, historyRes] = await Promise.all([
    supabase.from('profiles').select('id, nom'),
    supabase.from('elo_history').select('player_id, elo_value').order('id', { ascending: false })
  ]);

  const profiles = profilesRes.data || [];
  const rawHistory = historyRes.data || [];

  // 2. Mapping des scores les plus récents
  const latestScoresMap: Record<string, number> = {};
  rawHistory.forEach(entry => {
    const pid = String(entry.player_id);
    if (!(pid in latestScoresMap)) {
      latestScoresMap[pid] = parseFloat(entry.elo_value);
    }
  });

  // 3. Construction du tableau final
  const leaderboard = profiles.map(p => {
    const pid = String(p.id);
    return {
      id: p.id,
      nom: p.nom || `Joueur #${p.id}`,
      elo: latestScoresMap[pid] ?? 100 // 100 par défaut
    };
  }).sort((a, b) => b.elo - a.elo);

  if (leaderboard.length === 0) {
    return <div className="p-20 text-center text-white font-black italic">Aucune donnée trouvée.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      
      {/* HEADER SAINT-TROPEZ STYLE */}
      <div className="relative pt-20 pb-24 px-6 overflow-hidden">
        {/* Effet de lueur rouge en arrière-plan */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto relative text-center">
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-4">
            résidence <span className="text-red-600">PST</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.5em] italic">
            Classement Officiel des Joueurs
          </p>
        </div>
      </div>

      {/* LISTE DES JOUEURS - LOOK SPORT-TECH */}
      <div className="max-w-2xl mx-auto -mt-12 px-4 relative z-10">
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
          
          <div className="divide-y divide-white/5">
            {leaderboard.map((player, index) => {
              const isTop3 = index < 3;
              const rankColor = index === 0 ? 'text-red-600' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-500' : 'text-zinc-700';

              return (
                <Link 
                  key={player.id} 
                  href={`/joueurs/${player.id}`}
                  className="flex items-center p-6 hover:bg-white/5 active:bg-red-600/5 transition-all group relative"
                >
                  {/* EFFET DE LIGNE AU SURVOL */}
                  <div className="absolute left-0 w-1 h-0 bg-red-600 group-hover:h-full transition-all duration-300" />

                  {/* RANG */}
                  <div className={`w-12 flex justify-center text-3xl font-black italic ${rankColor}`}>
                    {index + 1}
                  </div>

                  {/* INFOS JOUEUR */}
                  <div className="flex-1 ml-6">
                    <div className="flex items-center gap-2 mb-0.5">
                      {isTop3 && <Zap size={14} className="text-red-600 fill-red-600" />}
                      <span className="text-lg font-black uppercase italic tracking-tight text-white group-hover:text-red-500 transition-colors">
                        {player.nom}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <Target size={10} className="text-red-600" /> Profil Joueur
                      </span>
                    </div>
                  </div>

                  {/* ELO SCORE BOX */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[9px] text-gray-600 font-black uppercase leading-none mb-1 tracking-widest">Points ELO</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-3xl font-mono font-black italic text-white leading-none">
                          {player.elo.toFixed(0)}
                        </p>
                        <span className="text-red-600 font-black text-xs">PTS</span>
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-zinc-800 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>

        </div>
        
        {/* FOOTER CLASSEMENT */}
        <p className="text-center mt-8 text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">
          Mise à jour en temps réel via Supabase Engine
        </p>
      </div>
    </div>
  );
}
