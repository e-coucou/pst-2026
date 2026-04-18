import { createClient } from '@/utils/supabase/server';
import EloChart from '@/components/EloChart';
import StatsCard from '@/components/StatsCard';
import SeasonHistory from '@/components/SeasonHistory';

export default async function PlayerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const playerId = parseInt(id, 10);

  // 1. Profil
  const { data: player } = await supabase.from('profiles').select('*').eq('id', playerId).single();
  if (!player) return <div className="p-20 text-white">Joueur introuvable</div>;

  // 2. Historique ELO
  const { data: history } = await supabase
    .from('elo_history')
    .select('*')
    .eq('player_id', playerId)
    .order('game_id', { ascending: true });

  // 3. Équipes (SANS la colonne palmares qui n'existe pas)
  const { data: teamsTireur } = await supabase
    .from('teams')
    .select('id, nom, pointeur_id, tireur_id')
    .eq('tireur_id', playerId);

  const { data: teamsPointeur } = await supabase
    .from('teams')
    .select('id, nom, pointeur_id, tireur_id')
    .eq('pointeur_id', playerId);

  // 4. Récupération de TOUS les profils pour les noms des partenaires
  const { data: allProfiles } = await supabase.from('profiles').select('id, nom');
  const profileMap = Object.fromEntries(allProfiles?.map(p => [p.id, p.nom]) || []);

  const eloHistory = history || [];
  const lastEntry = eloHistory[eloHistory.length - 1];

  // Construction de la liste des équipes
  const allTeams = [
    ...(teamsTireur || []).map(t => ({ 
      id: t.id, 
      nom: t.nom, 
      role: 'Tireur', 
      partenaire: profileMap[t.pointeur_id] || "Inconnu" 
    })),
    ...(teamsPointeur || []).map(t => ({ 
      id: t.id, 
      nom: t.nom, 
      role: 'Pointeur', 
      partenaire: profileMap[t.tireur_id] || "Inconnu"
    }))
  ];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 bg-black text-white min-h-screen">
      
      {/* HEADER */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 flex justify-between items-center shadow-2xl">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">{player.nom}</h1>
          <p className="text-blue-400 font-bold text-sm mt-1 uppercase">Classement : #{lastEntry?.rank_at_time || "--"}</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-600/30 text-center min-w-[100px]">
             <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">ELO PST</p>
             <p className="text-2xl font-mono font-black">{(lastEntry?.elo_value || 100).toFixed(1)}</p>
           </div>
           <div className="bg-purple-600/10 p-4 rounded-xl border border-purple-600/30 text-center min-w-[100px]">
             <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">Modern</p>
             <p className="text-2xl font-mono font-black">{(lastEntry?.elo_modern_value || 100).toFixed(1)}</p>
           </div>
        </div>
      </div>

      {/* GRAPHIQUE */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 h-[350px]">
        <EloChart history={eloHistory} />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Matchs" value={eloHistory.length} color="gray" />
        <StatsCard label="Tireur" value={teamsTireur?.length || 0} color="orange" />
        <StatsCard label="Pointeur" value={teamsPointeur?.length || 0} color="purple" />
        <StatsCard label="Ratio" value="65%" color="green" />
      </div>

      {/* PALMARÈS (Tableau simplifié et fonctionnel) */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl">
        <div className="p-6 border-b border-gray-800 bg-gray-900/50">
           <h2 className="text-xl font-bold uppercase italic tracking-widest">Équipes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest border-b border-gray-800">
                <th className="p-4">Équipe</th>
                <th className="p-4">Rôle</th>
                <th className="p-4">Partenaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {allTeams.map((team) => (
                <tr key={team.id} className="text-sm hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold text-white">{team.nom}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${team.role === 'Tireur' ? 'bg-orange-900/30 text-orange-400 border border-orange-500/20' : 'bg-purple-900/30 text-purple-400 border border-purple-500/20'}`}>
                      {team.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 font-medium">{team.partenaire}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SAISONS (Vérifie si ce composant affiche quelque chose maintenant) */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white uppercase italic tracking-widest">Saisons</h2>
        <SeasonHistory playerId={player.id} />
      </div>
    </div>
  );
}
