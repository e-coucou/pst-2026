import { createClient } from '@/utils/supabase/server';
import EloChart from '@/components/EloChart';
import StatsCard from '@/components/StatsCard';
import SeasonHistory from '@/components/SeasonHistory';
import Link from 'next/link';
import { ChevronLeft, Zap, Target, Award } from 'lucide-react';

export default async function PlayerProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const playerId = parseInt(id, 10);

  // 1. Récupération des données
  const { data: player } = await supabase.from('profiles').select('*').eq('id', playerId).single();
  if (!player) return <div className="p-20 text-white font-black uppercase text-center">Joueur introuvable</div>;

  const { data: historyAll } = await supabase.from('history_all').select('*').eq('player_id', playerId).order('game_id', { ascending: true });
  const { data: history } = await supabase.from('elo_history').select('*').eq('player_id', playerId).order('game_id', { ascending: true });
  const { data: ranking } = await supabase.rpc('get_player_elo', { p_id: playerId });
  const { data: seasonStats } = await supabase.rpc('get_player_stats', { p_id: playerId });

  // 2. Fusion des stats
  const mergedStats = seasonStats?.map((ms: any) => {
    const eloInfo = ranking?.find((er: any) => er.annee === ms.annee);
    return {
      ...ms,
      rank_elo_final: eloInfo?.rank_elo || ms.rank_elo, 
      rank_elo_modern_final: eloInfo?.rank_modern_elo || ms.rank_modern_elo
    };
  });

  const eloHistory = history || [];
  const lastEntry = eloHistory[eloHistory.length - 1];

  // 3. Calculs des totaux
  const totalWins = seasonStats?.reduce((acc: number, curr: any) => acc + curr.victoires, 0) || 0;
  const totalLost = seasonStats?.reduce((acc: number, curr: any) => acc + curr.defaites, 0) || 0;
  const totalMatches = eloHistory.length;
  const winRatio = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-10 bg-black text-white min-h-screen">
      
      {/* HEADER PROFIL : LOOK "ATHLÈTE PRO" */}
      <div className="relative bg-zinc-900/90 rounded-[2.5rem] p-8 md:p-12 border border-white/5 overflow-hidden">
        {/* Halo décoratif */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[80px] rounded-full -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-[9px] font-black rounded-full mb-4 tracking-widest">
              <Zap size={10} className="fill-white" /> PROFIL OFFICIEL
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-4">
              {player.nom}
            </h1>
            <p className="text-zinc-500 font-bold text-sm uppercase tracking-[0.3em]">
              Ranking PST : <span className="text-red-500">#{lastEntry?.rank_at_time || "--"}</span>
            </p>
          </div>

          {/* ELO CARDS DUAL */}
          <div className="flex gap-4 w-full md:w-auto">
            <div className="group flex-1 bg-red-700 border border-red-600/30 p-6 rounded-3xl text-center min-w-[140px] hover:border-red-600 transition-all">
              <p className="text-[10px] text-red-200 font-black uppercase mb-2 tracking-widest">ELO Score</p>
              <p className="text-4xl font-mono font-black italic">{(lastEntry?.elo_value || 100).toFixed(1)}</p>
            </div>
            <div className="group flex-1 bg-purple-700 border border-purple-600/30 p-6 rounded-3xl text-center min-w-[140px] hover:border-purple-600 transition-all">
              <p className="text-[10px] text-purple-200 font-black uppercase mb-2 tracking-widest">Modern</p>
              <p className="text-4xl font-mono font-black italic">{(lastEntry?.elo_modern_value || 100).toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* GRAPHIQUE PROGRESSION */}
      <div className="bg-zinc-900/20 rounded-[2rem] p-8 border border-white/5">
        <div className="flex items-center gap-4 mb-8">
          <Target size={18} className="text-red-600" />
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Courbe évolution du score ELO/Modern</h2>
        </div>
        <div className="h-[350px] w-full">
          <EloChart history={eloHistory} />
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatsCard label="Matchs" value={totalMatches} color="zinc" />
        <StatsCard label="Victoires" value={totalWins} color="red" />
        <StatsCard label="Nuls" value={totalMatches - totalWins - totalLost} color="zinc" />
        <StatsCard label="Défaites" value={totalLost} color="orange" />
        <StatsCard label="Ratio" value={`${winRatio}%`} color="purple" />
        <StatsCard 
          label="Goal Avg" 
          value={(seasonStats?.reduce((acc: number, curr: any) => acc + Number(curr.goalavg), 0) || 0)} 
          color={winRatio > 50 ? "red" : "orange"} 
        />
      </div>

      {/* HISTORIQUE PAR SAISON */}
      <div className="pt-10">
        <div className="flex items-center gap-6 mb-10">
          <div className="flex items-center gap-3">
            <Award size={24} className="text-red-600" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter"><span  className="text-red-600">Historique</span><span className="text-white"> des Tournois</span></h2>
          </div>
          <div className="h-px flex-1 bg-zinc-800"></div>
        </div>
        
        <SeasonHistory 
          stats={mergedStats as any || []} 
          fullHistory={eloHistory as any || []}
          historyAll={historyAll as any || []}
        />
      </div>

    </div>
  );
}
