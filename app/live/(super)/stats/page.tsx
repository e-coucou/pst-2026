'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line
} from 'recharts';
import { 
  Trophy, Users, Target, Activity, 
  TrendingUp, BarChart3, ChevronRight, Zap
} from 'lucide-react';

export default function StatsPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [eloHistory, setEloHistory] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from('games').select('*');
      if (data) setMatches(data);
      const { data: eloData } = await supabase.from('elo_history').select('*');
      if (eloData) setEloHistory(eloData);
      setLoading(false);
    }
    getStats();
  }, []);

  // --- CALCUL DES STATS ---
  const stats = useMemo(() => {
    if (!matches.length) return null;

    const distribution = Array(14).fill(0); // Index 0 à 13
    let totalPoints = 0;
    let totalWins = 0;
    let matchNuls = 0;

    matches.forEach(m => {
      const s1 = m.score_1;
      const s2 = m.score_2;
      const diff = Math.abs(s1 - s2);
      
      distribution[diff]++;
      totalPoints += (s1 + s2);
      if (s1 === s2) matchNuls++;
    });

    // Formater pour Recharts
    const chartData = distribution.map((val, idx) => ({
      name: idx === 0 ? 'Nul' : `${idx}pt${idx > 1 ? 's' : ''}`,
      quantite: val,
      gap: idx
    })).filter(d => d.gap > 0 || matchNuls > 0);

    return { chartData, totalPoints, matchNuls, avgPoints: (totalPoints / matches.length).toFixed(1) };
  }, [matches]);

// --- NOUVEAU CALCUL DES STATS JOUEURS ---
const playerStats = useMemo(() => {
  if (!eloHistory.length) return [];

  const playersMap = new Map();

  eloHistory.forEach(row => {
    // Dans elo_history, win = 1 (victoire), -1 (défaite)
    const isWin = row.win === 1;
    const isFannyGiven = row.sc_p === 13 && row.sc_c === 0;
    const isFannyTaken = row.sc_p === 0 && row.sc_c === 13;

    // Déduire le nom du joueur (selon qu'il était tireur ou pointeur)
    const playerName = row.tireur_id === row.player_id ? row.tireur : row.pointeur;

    if (!playersMap.has(row.player_id)) {
      playersMap.set(row.player_id, {
        id: row.player_id,
        name: playerName || `Joueur ${row.player_id}`,
        matches: 0,
        wins: 0,
        pointsPour: 0,
        pointsContre: 0,
        fannyGiven: 0,
        fannyTaken: 0,
      });
    }
console.log(playersMap)

    const p = playersMap.get(row.player_id);
    p.matches += 1;
    if (isWin) p.wins += 1;
    p.pointsPour += (row.sc_p || 0);
    p.pointsContre += (row.sc_c || 0);
    if (isFannyGiven) p.fannyGiven += 1;
    if (isFannyTaken) p.fannyTaken += 1;
  });

  // Transformer la Map en Array et calculer les ratios
  return Array.from(playersMap.values())
    .map(p => ({
      ...p,
      winrate: p.matches > 0 ? ((p.wins / p.matches) * 100).toFixed(1) : 0,
      goalAverage: p.pointsPour - p.pointsContre
    }))
    // On trie par défaut par Winrate, puis par nombre de matches
    .sort((a, b) => b.winrate - a.winrate || b.matches - a.matches);

}, [eloHistory]);


  const CustomBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  
  // Règle de couleur : Rouge si gap == 13 (Fanny), sinon Gris
  const fillColor = payload.gap === 13 ? '#dc2626' : '#3f3f46';
  
  // S'il n'y a pas de hauteur (quantité à 0), on ne dessine rien
  if (height === 0 || isNaN(height)) return null;

  return (
    <rect 
      x={x} 
      y={y} 
      width={width} 
      height={height} 
      fill={fillColor} 
      rx={4} // Bords arrondis en haut
      ry={4} 
    />
  );
};

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-red-600 animate-pulse font-black italic">CHARGEMENT DE LA DATA...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 pb-20">
      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-10">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">
          Stats <span className="text-red-600">Academy</span>
        </h1>
        <div className="flex gap-4 mt-6 overflow-x-auto pb-2 no-scrollbar">
          {['global', 'scores', 'joueurs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        
        {/* ONGLET GLOBAL */}
        {activeTab === 'global' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Matches Joués" value={matches.length} icon={<Activity size={20}/>} color="text-white" />
            <StatCard label="Points Marqués" value={stats?.totalPoints} icon={<Target size={20}/>} color="text-red-600" />
            <StatCard label="Moyenne / Match" value={stats?.avgPoints} icon={<TrendingUp size={20}/>} color="text-blue-500" />
            <StatCard label="Matchs Nuls" value={stats?.matchNuls} icon={<Zap size={20}/>} color="text-orange-500" />
          </div>
        )}

        {/* ONGLET ANALYSE DES SCORES */}
        {activeTab === 'scores' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem]">
              <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <BarChart3 className="text-red-600" size={18} />
                Distribution des écarts de score
              </h3>
              
              {/* On supprime le h-[300px] du div parent et on le met direct dans le composant Recharts */}
              <div className="w-full">
                <ResponsiveContainer width="99%" height={300}>
                  <BarChart 
                    data={stats?.chartData} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#71717a', fontSize: 10, fontWeight: 'bold'}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#71717a', fontSize: 10}} 
                    />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{
                        backgroundColor: '#09090b', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        fontSize: '12px',
                        color: '#fff'
                      }}
                      formatter={(value) => [`${value} match(s)`, 'Quantité']}
                    />
                    {/* C'est ici qu'on appelle notre CustomBar pour éviter le warning <Cell> */}
                    <Bar dataKey="quantite" shape={<CustomBar />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[10px] text-zinc-500 mt-6 font-bold uppercase italic text-center">
                Note : La barre en <span className="text-red-600">rouge</span> représente les "Fanny" (13-0).
              </p>
            </div>
          </div>
        )}        
        {/* On peut ajouter ici les autres onglets avec des listes de joueurs (Top Winrate, etc.) */}
{/* ONGLET JOUEURS (HALL OF FAME) */}
{activeTab === 'joueurs' && (
  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
    <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Trophy className="text-yellow-500" size={18} />
          Hall of Fame <span className="text-zinc-500">(Min. 5 matches)</span>
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              <th className="px-6 py-4">Rang</th>
              <th className="px-6 py-4">Joueur</th>
              <th className="px-6 py-4 text-center">Winrate</th>
              <th className="px-6 py-4 text-center">Matches</th>
              <th className="px-6 py-4 text-center">Diff. Pts</th>
              <th className="px-6 py-4 text-center text-red-500">Fanny Mises</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {playerStats
              .filter(p => p.matches >= 5) // On filtre ceux qui ont joué au moins 5 matches pour que le winrate soit significatif
              .map((player, index) => (
              <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4">
                  {index < 3 ? (
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-black ${
                      index === 0 ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
                      index === 1 ? 'bg-zinc-300' : 'bg-amber-700'
                    }`}>
                      {index + 1}
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-bold ml-2">{index + 1}</span>
                  )}
                </td>
                <td className="px-6 py-4 font-black italic uppercase text-lg">{player.name}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    parseFloat(player.winrate) >= 60 ? 'bg-green-500/10 text-green-500' : 
                    parseFloat(player.winrate) <= 40 ? 'bg-red-500/10 text-red-500' : 
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {player.winrate}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center font-bold text-zinc-400">
                  {player.matches} <span className="text-[10px] font-normal">({player.wins}V)</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`font-black ${player.goalAverage > 0 ? 'text-green-500' : player.goalAverage < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                    {player.goalAverage > 0 ? '+' : ''}{player.goalAverage}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {player.fannyGiven > 0 ? (
                    <span className="inline-flex items-center gap-1 font-bold text-red-600">
                      {player.fannyGiven} <Zap size={12} className="fill-red-600" />
                    </span>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}


      </main>
    </div>
  );
}


function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col gap-2">
      <div className={`${color} opacity-80`}>{icon}</div>
      <div className="text-2xl font-black italic tracking-tighter">{value}</div>
      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">{label}</div>
    </div>
  );
}