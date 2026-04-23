import { createClient } from '@/utils/supabase/server';
import EloChart from '@/components/EloChart';
import StatsCard from '@/components/StatsCard';
import SeasonHistory from '@/components/SeasonHistory';

export default async function PlayerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const playerId = parseInt(id, 10);

  // 1. Profil de base
  const { data: player } = await supabase.from('profiles').select('*').eq('id', playerId).single();
  
  if (!player) return <div className="p-20 text-white">Joueur introuvable</div>;

  // 2. Historique ELO pour le graphique (on garde le select simple ici)
  const { data: historyAll } = await supabase
    .from('history_all')
    .select('*')
    .eq('player_id', playerId)
    .order('game_id', { ascending: true });
    
  const { data: history } = await supabase
    .from('elo_history')
    .select('*')
    .eq('player_id', playerId)
    .order('game_id', { ascending: true });

  const { data: ranking } = await supabase.rpc('get_player_elo', { p_id: playerId });

  // 3. RECUPERATION DES STATS PAR SAISON (Ta requête SQL puissante)
  // On utilise .rpc() si tu as créé une fonction PostgreSQL, 
  // sinon on peut utiliser une vue ou adapter le composant SeasonHistory pour qu'il appelle l'API
  const { data: seasonStats } = await supabase.rpc('get_player_stats', { p_id: playerId });
  //console.log("📊 Stats récupérées:", seasonStats?.length || 0, "lignes");

  // 4. Fusionner les deux
  const mergedStats = seasonStats?.map(any: ms => {
    const eloInfo = ranking?.find(er => er.annee === ms.annee);
      return {
        ...ms,
        // On remplace ou on ajoute les valeurs de la table history_all
        rank_elo_final: eloInfo?.rank_elo || ms.rank_elo, 
        rank_elo_modern_final: eloInfo?.rank_modern_elo || ms.rank_modern_elo
      };
    });
  console.log(mergedStats[0], seasonStats[0], ranking[0])

  const eloHistory = history || [];
  const lastEntry = eloHistory[eloHistory.length - 1];

  // Calcul du ratio global
  const totalWins = seasonStats?.reduce((acc: number, curr: any) => acc + curr.victoires, 0) || 0;
  const totalLost = seasonStats?.reduce((acc: number, curr: any) => acc + curr.defaites, 0) || 0;
  const totalMatches = eloHistory.length;
  const winRatio = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 bg-black text-white min-h-screen font-sans">
      
      {/* HEADER : Identité et Rang */}
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 flex flex-col md:flex-row justify-between items-center shadow-2xl gap-6">
        <div>
          <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">
            {player.nom}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded">PROFIL OFFICIEL</span>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">
              Classement Actuel : <span className="text-blue-400">#{lastEntry?.rank_at_time || "--"}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-4 w-full md:w-auto">
           <div className="flex-1 bg-gradient-to-br from-blue-600/20 to-transparent p-5 rounded-2xl border border-blue-500/30 text-center min-w-[120px]">
             <p className="text-[10px] text-blue-400 font-black uppercase mb-1 tracking-widest">ELO</p>
             <p className="text-3xl font-mono font-black">{(lastEntry?.elo_value || 100).toFixed(1)}</p>
           </div>
           <div className="flex-1 bg-gradient-to-br from-purple-600/20 to-transparent p-5 rounded-2xl border border-purple-500/30 text-center min-w-[120px]">
             <p className="text-[10px] text-purple-400 font-black uppercase mb-1 tracking-widest">Modern</p>
             <p className="text-3xl font-mono font-black">{(lastEntry?.elo_modern_value || 100).toFixed(1)}</p>
           </div>
        </div>
      </div>

      {/* GRAPHIQUE ELO */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-inner">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-500 text-center">Progression de carrière</h2>
        </div>
        <div className="h-[300px]">
          <EloChart history={eloHistory} />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatsCard label="Matchs" value={totalMatches} color="gray" />
        <StatsCard label="Victoires" value={totalWins} color="green" />
        <StatsCard label="Nuls" value={totalMatches -totalWins - totalLost} color="blue" />
        <StatsCard label="Défaites" value={totalLost} color="orange" />
        <StatsCard label="Ratio" value={`${winRatio}%`} color="purple" />
		<StatsCard 
   			label="Goal Avg" 
    		value={(seasonStats?.reduce((acc: number, curr: any) => acc + Number(curr.goalavg), 0) || 0)} 
    		color={winRatio > 50 ? "green" : "orange"} 
  		/>
        </div>

      {/* HISTORIQUE DES SAISONS (Le nouveau composant) */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Historique des Saisons</h2>
          <div className="h-px flex-1 bg-gray-800"></div>
        </div>
        
        {/* On passe les données déjà calculées par SQL au composant */}
        <SeasonHistory stats = {mergedStats as any || [] } />
      </div>

    </div>
  );
}
