import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Trophy, Medal, ArrowRight, ChevronLeft } from 'lucide-react';

export default async function Leaderboard() {
  const supabase = await createClient();

  // 1. On récupère les deux tables séparément (Zéro problème de jointure)
  const [profilesRes, historyRes] = await Promise.all([
    supabase.from('profiles').select('id, nom'),
    supabase.from('elo_history').select('player_id, elo_value').order('id', { ascending: false })
  ]);

  const profiles = profilesRes.data || [];
  const rawHistory = historyRes.data || [];

  // 2. On crée un dictionnaire des noms pour un accès instantané
  // On force l'ID en string pour éviter les conflits de type
  const nameMap: Record<string, string> = {};
  profiles.forEach(p => {
    nameMap[String(p.id)] = p.nom;
  });

  // 3. On extrait uniquement le DERNIER score pour chaque joueur
  const latestScoresMap: Record<string, number> = {};
  
  // Comme rawHistory est trié par ID descendant, le premier qu'on croise est le plus récent
  rawHistory.forEach(entry => {
    const pid = String(entry.player_id);
    if (!(pid in latestScoresMap)) {
      latestScoresMap[pid] = parseFloat(entry.elo_value);
    }
  });

  // 4. On construit le tableau final en partant des profils 
  // (pour être sûr d'avoir les noms et de n'oublier personne)
  const leaderboard = profiles.map(p => {
    const pid = String(p.id);
    return {
      id: p.id,
      nom: p.nom || `Joueur #${p.id}`,
      elo: latestScoresMap[pid] ?? 100 // 100 par défaut si pas de match
    };
  })
  // 5. Tri final par ELO
  .sort((a, b) => b.elo - a.elo);

  if (leaderboard.length === 0) {
    return <div className="p-20 text-center">Aucune donnée trouvée.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
	{/* BOUTON RETOUR */}
	<div className="mb-4">
	  <Link 
	    href="/" 
	    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
	  >
	    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
	    <span className="text-sm font-bold uppercase tracking-widest">Retour</span>
	  </Link>
	</div>

      {/* HEADER */}
      <div className="bg-blue-700 text-white pt-16 pb-24 px-6 text-center shadow-inner">
        <h1 className="text-4xl font-extrabold flex justify-center items-center gap-3 italic tracking-tight">
          PST <span className="text-orange-400">LEADERBOARD</span> <Trophy className="text-yellow-400 shrink-0" />
        </h1>
        <p className="mt-2 text-blue-100/70 text-sm font-bold uppercase tracking-widest">Classement Officiel 2026</p>
      </div>

      {/* LISTE DES JOUEURS */}
      <div className="max-w-2xl mx-auto -mt-12 px-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {leaderboard.map((player, index) => (
              <Link 
                key={player.id} 
                href={`/joueurs/${player.id}`}
                className="flex items-center p-5 hover:bg-blue-50 active:bg-blue-100 transition-all group"
              >
                {/* RANG */}
                <div className="w-10 flex justify-center text-lg font-black italic text-slate-300 group-hover:text-blue-400">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                </div>

                {/* NOM */}
                <div className="flex-1 ml-4 font-bold text-slate-800 text-lg uppercase tracking-tight">
                  {player.nom}
                </div>

                {/* ELO */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Elo PST</p>
                    <p className="text-xl font-mono font-black text-blue-700 leading-tight">
                      {player.elo.toFixed(1)}
                    </p>
                  </div>
                  <ArrowRight size={18} className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
