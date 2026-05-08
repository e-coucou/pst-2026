'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line
} from 'recharts';
import { 
  Trophy, Users, Target, Activity, 
  TrendingUp, BarChart3, ChevronRight, Zap, X,
  Flame, Skull, HeartPulse, Crosshair, Crown
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StatsPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [eloHistory, setEloHistory] = useState<any[]>([]);
  const supabase = createClient();
  const router = useRouter();

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

  // --- NOUVEAU CALCUL DES STATS JOUEURS (AVEC SÉRIES ET RECORDS) ---
  const playerStats = useMemo(() => {
    if (!eloHistory || eloHistory.length === 0) return [];

    const playersMap = new Map();

    // On trie l'historique par ordre chronologique pour que le calcul des séries fonctionne
    const sortedHistory = [...eloHistory].sort((a, b) => a.id - b.id);

    sortedHistory.forEach(row => {
      // Sécurisation des types (conversion en nombres)
      const winVal = Number(row.win);
      const scP = Number(row.sc_p);
      const scC = Number(row.sc_c);
      const currentElo = Number(row.elo_value);
      const role = row.role ? row.role.toLowerCase() : '';

      const isWin = winVal === 1;
      const isFannyGiven = scP === 13 && scC === 0;
      const isFannyTaken = scP === 0 && scC === 13;
      const playerName = row.nom || `Joueur ${row.player_id}`;

      if (!playersMap.has(row.player_id)) {
        playersMap.set(row.player_id, {
          id: row.player_id,
          name: playerName,
          matches: 0,
          wins: 0,
          pointsPour: 0,
          pointsContre: 0,
          fannyGiven: 0,
          fannyTaken: 0,
          // Nouvelles stats records :
          currentWinStreak: 0,
          maxWinStreak: 0,
          currentLossStreak: 0,
          maxLossStreak: 0,
          clutchWins: 0,
          peakElo: isNaN(currentElo) ? 0 : currentElo,
          tireurMatches: 0,
          tireurWins: 0,
          pointeurMatches: 0,
          pointeurWins: 0
        });
      }

      const p = playersMap.get(row.player_id);
      p.matches += 1;

      // --- SÉRIES (STREAKS) & VICTOIRES ---
      if (isWin) {
        p.wins += 1;
        p.currentWinStreak += 1;
        p.currentLossStreak = 0; // Remise à zéro de la série de défaites
        if (p.currentWinStreak > p.maxWinStreak) p.maxWinStreak = p.currentWinStreak;
      } else if (winVal === -1) {
        p.currentLossStreak += 1;
        p.currentWinStreak = 0; // Remise à zéro de la série de victoires
        if (p.currentLossStreak > p.maxLossStreak) p.maxLossStreak = p.currentLossStreak;
      }

      // --- POINTS & FANNYS ---
      if (!isNaN(scP)) p.pointsPour += scP;
      if (!isNaN(scC)) p.pointsContre += scC;
      if (isFannyGiven) p.fannyGiven += 1;
      if (isFannyTaken) p.fannyTaken += 1;

      // --- INDICE CLUTCH (Gagné 13-12) ---
      if (isWin && scP === 13 && scC === 12) {
        p.clutchWins += 1;
      }

      // --- SOMMET ELO ---
      if (!isNaN(currentElo) && currentElo > p.peakElo) {
        p.peakElo = currentElo;
      }

      // --- SPÉCIALISATION (RÔLE) ---
      if (role === 'tireur') {
        p.tireurMatches += 1;
        if (isWin) p.tireurWins += 1;
      } else if (role === 'pointeur') {
        p.pointeurMatches += 1;
        if (isWin) p.pointeurWins += 1;
      }
    });

    // Transformer la Map en Array et formater les ratios
    return Array.from(playersMap.values())
      .map(p => {
        const winrateCalc = p.matches > 0 ? (p.wins / p.matches) * 100 : 0;
        return {
          ...p,
          winrate: winrateCalc.toFixed(1),
          winrateNum: winrateCalc, // Gardé sous forme numérique pour le tri correct
          goalAverage: p.pointsPour - p.pointsContre,
          tireurWinrate: p.tireurMatches > 0 ? ((p.tireurWins / p.tireurMatches) * 100).toFixed(1) : "-",
          pointeurWinrate: p.pointeurMatches > 0 ? ((p.pointeurWins / p.pointeurMatches) * 100).toFixed(1) : "-",
          peakElo: p.peakElo.toFixed(1)
        };
      })
      // On trie par défaut par Winrate, puis par nombre de matches
      .sort((a, b) => b.winrateNum - a.winrateNum || b.matches - a.matches);

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
        <div className="max-w-6xl mx-auto mb-8 flex flex-cols justify-between items-center gap-4">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">
            Stats <span className="text-red-600">Academy</span>
          </h1>
          <button 
            onClick={() => router.push('/live/super')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex gap-4 mt-6 overflow-x-auto pb-2 no-scrollbar">
          {['global', 'scores', 'joueurs', 'records'].map((tab) => (
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
                      <th className="px-3 py-4">Rang</th>
                      <th className="px-15 py-4">Joueur</th>
                      <th className="px-4 py-4 text-center">Winrate</th>
                      <th className="px-4 py-4 text-center">Matches</th>
                      <th className="px-4 py-4 text-center">Diff. Pts</th>
                      <th className="px-4 py-4 text-center text-red-500">Fanny Mises</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {playerStats
                      .filter(p => p.matches >= 5) 
                      .map((player, index) => (
                      <tr key={player.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-4">
                          {index < 3 ? (
                            <span className={`flex items-center justify-center w-7 h-7 rounded-full font-black text-black ${
                              index === 0 ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 
                              index === 1 ? 'bg-zinc-300' : 'bg-amber-700'
                            }`}>
                              {index + 1}
                            </span>
                          ) : (
                            <span className="text-zinc-500 font-bold ml-2">{index + 1}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-black italic uppercase text-sm">{player.name}</td>
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

        {/* ONGLET RECORDS & TROPHÉES */}
        {activeTab === 'records' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-300">
            
            <RecordCard 
              title="Série d'Invincibilité" 
              icon={<Flame className="text-orange-500" size={24} />}
              data={playerStats.sort((a, b) => b.maxWinStreak - a.maxWinStreak)[0]}
              valueKey="maxWinStreak"
              suffix="Victoires consécutives"
              color="border-orange-500/30 bg-orange-500/5 text-orange-500"
            />

            <RecordCard 
              title="Le Chat Noir" 
              icon={<Skull className="text-zinc-500" size={24} />}
              data={playerStats.sort((a, b) => b.maxLossStreak - a.maxLossStreak)[0]}
              valueKey="maxLossStreak"
              suffix="Défaites consécutives"
              color="border-zinc-700 bg-zinc-900 text-zinc-400"
            />

            <RecordCard 
              title="Nerfs d'Acier" 
              icon={<HeartPulse className="text-red-500" size={24} />}
              data={playerStats.sort((a, b) => b.clutchWins - a.clutchWins)[0]}
              valueKey="clutchWins"
              suffix="Victoires sur le fil (13-12)"
              color="border-red-500/30 bg-red-500/5 text-red-500"
            />

            <RecordCard 
              title="Tireur d'Élite" 
              icon={<Crosshair className="text-blue-500" size={24} />}
              data={playerStats.filter(p => p.tireurMatches >= 5).sort((a, b) => Number(b.tireurWinrate) - Number(a.tireurWinrate))[0]}
              valueKey="tireurWinrate"
              suffix="% de victoire au tir"
              color="border-blue-500/30 bg-blue-500/5 text-blue-500"
            />

            <RecordCard 
              title="Le Sommet ELO" 
              icon={<Crown className="text-yellow-500" size={24} />}
              data={playerStats.sort((a, b) => Number(b.peakElo) - Number(a.peakElo))[0]}
              valueKey="peakElo"
              suffix="Record ELO absolu"
              color="border-yellow-500/30 bg-yellow-500/5 text-yellow-500"
            />

          </div>
        )}

      </main>
    </div>
  );
}

// --- SOUS COMPOSANTS ---

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2rem] flex flex-col gap-2">
      <div className={`${color} opacity-80`}>{icon}</div>
      <div className="text-2xl font-black italic tracking-tighter">{value}</div>
      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">{label}</div>
    </div>
  );
}

function RecordCard({ title, icon, data, valueKey, suffix, color }: any) {
  if (!data) return null; // Sécurité si aucune donnée

  return (
    <div className={`p-6 rounded-3xl border ${color} flex flex-col justify-between min-h-[160px]`}>
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
      </div>
      
      <div>
        <div className="text-3xl font-black italic tracking-tighter text-white uppercase">
          {data.name}
        </div>
        <div className="text-lg font-bold mt-1">
          {data[valueKey]} <span className="text-xs font-normal uppercase tracking-widest opacity-70">{suffix}</span>
        </div>
      </div>
    </div>
  );
}