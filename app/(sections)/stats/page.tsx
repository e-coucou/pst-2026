'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, LabelList
} from 'recharts';
import {
  Trophy, Users, Target, Activity,
  TrendingUp, BarChart3, ChevronRight, Zap, X,
  Flame, Skull, HeartPulse, Crosshair, Crown,
  Eye, ArrowUpRight, Rocket, ShieldOff, Swords, Frown, Focus, Handshake,
  Medal, ThumbsDown, Thermometer, ImageIcon
} from 'lucide-react';
import GlobalProgressionChart from '@/components/GlobalProgressionChart';
import MatchupMatrixGrid from '@/components/MatchupMatrixGrid';
import { computeTeammateMatrix, type MatchupMatrix } from '@/utils/matchup-matrix';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logActivity } from '@/utils/log-activity';
import FavoriStar from '@/components/FavoriStar';
import { useFavoriId } from '@/hooks/useFavoriId';

// Traduit un chemin brut en libellé lisible (même logique que /live/activity)
function prettyPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Accueil';

  const BASE_LABELS: Record<string, string> = {
    tournois: 'Tournois',
    live: 'Live',
    classement: 'Classement',
    joueurs: 'Joueurs',
    videos: 'Vidéos',
    render: 'Résidence',
    stats: 'Statistiques',
  };

  const base = BASE_LABELS[segments[0]] || segments[0];
  const rest = segments.slice(1).join(' · ');
  return rest ? `${base} · ${rest}` : base;
}

// Classe une liste de joueurs par une métrique de record ; en cas d'égalité,
// privilégie les pointeurs (plus de matchs joués en pointeur qu'en tireur).
function topByMetric(list: any[], metric: (p: any) => number): any {
  return [...list].sort((a, b) => {
    const diff = metric(b) - metric(a);
    if (diff !== 0) return diff;
    return (b.pointeurMatches - b.tireurMatches) - (a.pointeurMatches - a.tireurMatches);
  })[0];
}

interface PopularityStats {
  topPage: { path: string; count: number } | null;
  topPlayers: { id: number; nom: string; count: number }[];
  topTournament: { year: string; count: number } | null;
  topPhoto: { path: string; count: number; url: string | null } | null;
}

//pour le graphique de progression historique, on peut réutiliser le même composant que dans la section classement/progression, en lui passant les données nécessaires (timeline complète et liste des joueurs)
//export const dynamic = 'force-dynamic';
//export const revalidate = 0;

export default function StatsPage() {
  const favoriId = useFavoriId();
  const [matches, setMatches] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [eloHistory, setEloHistory] = useState<any[]>([]);
  const supabase = createClient();
  const router = useRouter();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [allPlayerNames, setAllPlayerNames] = useState<string[]>([]);
  const [nbYears, setNbYears] = useState(0);
  const [selectedSeason, setSelectedSeason] = useState<'global' | number>('global');
  const [popularity, setPopularity] = useState<PopularityStats>({ topPage: null, topPlayers: [], topTournament: null, topPhoto: null });
  const [teammateMatrix, setTeammateMatrix] = useState<MatchupMatrix>({});

  useEffect(() => {
    logActivity(supabase, 'PAGE_VIEW', { path: '/stats', tab: activeTab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    async function getStats() {
      const { data } = await supabase.from('games').select('*');
      if (data) setMatches(data);
      const { data: eloData } = await supabase.from('elo_history').select('*');
      if (eloData) setEloHistory(eloData);
      computeTeammateMatrix(supabase).then(setTeammateMatrix);

      // On lance les deux requêtes en parallèle pour la performance
      const [timelineRes, profilesRes, seasons, popularityRes] = await Promise.all([
        supabase.rpc('get_full_timeline'),
        supabase.from('profiles').select('nom'),
        supabase.from('games').select('year'), //.distinct() // Note: le support du .distinct() dépend de ta version de librairie.
        supabase.rpc('get_popularity_stats')
      ]);

      setNbYears(seasons.data ? new Set(seasons.data.map(g => g.year)).size : 0);

      if (popularityRes.data) {
        const topPhoto = popularityRes.data.topPhoto ?? null;
        let topPhotoUrl: string | null = null;

        if (topPhoto?.path) {
          const { data: signed } = await supabase.storage
            .from('photos_import')
            .createSignedUrl(topPhoto.path, 3600);
          topPhotoUrl = signed?.signedUrl ?? null;
        }

        setPopularity({
          topPage: popularityRes.data.topPage ?? null,
          topPlayers: popularityRes.data.topPlayers ?? [],
          topTournament: popularityRes.data.topTournament ?? null,
          topPhoto: topPhoto ? { ...topPhoto, url: topPhotoUrl } : null,
        });
      }
      if (popularityRes.error) {
        console.error('[ERROR] RPC get_popularity_stats:', popularityRes.error);
      }

      // Debug : Vérification du nombre de matchs récupérés (dans ta console terminal)
      if (timelineRes.data) {
        console.log(`[DEBUG] Timeline récupérée : ${timelineRes.data.length} matchs.`);
      }

      if (timelineRes.error) {
        console.error('[ERROR] Erreur RPC get_full_timeline:', timelineRes.error);
      }

      // Extraction sécurisée des données
      setTimeline(timelineRes.data || []);
      setAllPlayerNames(profilesRes.data?.map(p => p.nom).filter(Boolean) || []);

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

  // --- SAISONS DISPONIBLES (pour le sélecteur du graphique des écarts) ---
  const availableSeasons = useMemo(() => {
    const years = new Set<number>();
    matches.forEach(m => { if (m.year) years.add(m.year); });
    return Array.from(years).sort((a, b) => b - a);
  }, [matches]);

  // --- DISTRIBUTION DES ÉCARTS FILTRÉE PAR SAISON (le cumul global reste la valeur par défaut) ---
  const scoreDistribution = useMemo(() => {
    if (!matches.length) return null;

    const filtered = selectedSeason === 'global' ? matches : matches.filter(m => m.year === selectedSeason);
    const distribution = Array(14).fill(0);
    let matchNulsFiltered = 0;

    filtered.forEach(m => {
      const s1 = m.score_1;
      const s2 = m.score_2;
      const diff = Math.abs(s1 - s2);

      distribution[diff]++;
      if (s1 === s2) matchNulsFiltered++;
    });

    const chartData = distribution.map((val, idx) => ({
      name: idx === 0 ? 'Nul' : `${idx}pt${idx > 1 ? 's' : ''}`,
      quantite: val,
      gap: idx
    })).filter(d => d.gap > 0 || matchNulsFiltered > 0);

    return { chartData, total: filtered.length };
  }, [matches, selectedSeason]);

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
      // Fanny = adversaire à 0, quel que soit le score final (matchs de poule limités dans le temps,
      // pas toujours joués jusqu'à 13).
      const isFannyGiven = scP > 0 && scC === 0;
      const isFannyTaken = scC > 0 && scP === 0;
      // Défaite sur le fil : 12-13 ou 11-13
      const isCloseLoss = winVal === -1 && scC === 13 && (scP === 12 || scP === 11);
      const playerName = row.nom || `Joueur ${row.player_id}`;

      if (!playersMap.has(row.player_id)) {
        playersMap.set(row.player_id, {
          id: row.player_id,
          name: playerName,
          matches: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          pointsPour: 0,
          pointsContre: 0,
          fannyGiven: 0,
          fannyTaken: 0,
          closeLosses: 0,
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
        p.losses += 1;
        p.currentLossStreak += 1;
        p.currentWinStreak = 0; // Remise à zéro de la série de victoires
        if (p.currentLossStreak > p.maxLossStreak) p.maxLossStreak = p.currentLossStreak;
      } else if (winVal === 0) {
        p.draws += 1;
        // Un nul ne casse pas une série en cours (comportement d'origine inchangé).
      }

      // --- POINTS & FANNYS ---
      if (!isNaN(scP)) p.pointsPour += scP;
      if (!isNaN(scC)) p.pointsContre += scC;
      if (isFannyGiven) p.fannyGiven += 1;
      if (isFannyTaken) p.fannyTaken += 1;
      if (isCloseLoss) p.closeLosses += 1;

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
      <header className="max-w-7xl mx-auto mb-10">
        <div className="max-w-7xl mx-auto mb-8 flex flex-cols justify-between items-center gap-4">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase">
            Stats <span className="text-red-600">Academy</span>
          </h1>
          <button 
            onClick={() => router.push('/live/super')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </div>
        <div className="flex gap-4 mt-6 overflow-x-auto pb-2 no-scrollbar">
          {['global', 'scores', 'joueurs', 'duos', 'records', 'évolution', 'popularité'].map((tab) => (
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

      <main className="max-w-7xl mx-auto space-y-8">
        
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
              <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="text-red-600" size={18} />
                  Distribution des écarts de score
                </h3>

                {availableSeasons.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setSelectedSeason('global')}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedSeason === 'global' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                      }`}
                    >
                      Global
                    </button>
                    {availableSeasons.map(year => (
                      <button
                        key={year}
                        onClick={() => setSelectedSeason(year)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                          selectedSeason === year ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full">
                <ResponsiveContainer width="99%" height={300}>
                  <BarChart
                    data={scoreDistribution?.chartData}
                    margin={{ top: 24, right: 10, left: -20, bottom: 0 }}
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
                    <Bar dataKey="quantite" shape={<CustomBar />}>
                      <LabelList
                        dataKey="quantite"
                        position="top"
                        formatter={(value: any) => (value > 0 ? value : '')}
                        style={{ fill: '#a1a1aa', fontSize: 11, fontWeight: 'bold' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <p className="text-[10px] text-zinc-500 mt-6 font-bold uppercase italic text-center">
                {selectedSeason !== 'global' && `Saison ${selectedSeason} — ${scoreDistribution?.total} match(s) · `}
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
                      <th className="px-14 py-4">Joueur</th>
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

        {/* ONGLET DUOS (COÉQUIPIERS) */}
        {activeTab === 'duos' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <MatchupMatrixGrid
              players={playerStats.map(p => ({ id: p.id, nom: p.name }))}
              matrix={teammateMatrix}
              title="Matrice des duos (coéquipiers)"
              relationLabel="avec"
              positiveLabel="duo gagnant"
              negativeLabel="duo en difficulté"
              getHref={() => null}
            />
          </div>
        )}

        {/* ONGLET RECORDS & TROPHÉES */}
        {activeTab === 'records' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-300">
            
            <RecordCard
              title="Série d'Invincibilité"
              icon={<Flame className="text-orange-500" size={24} />}
              data={topByMetric(playerStats, p => p.maxWinStreak)}
              valueKey="maxWinStreak"
              suffix="Matchs sans défaite"
              color="border-orange-500/30 bg-orange-500/5 text-orange-500"
              favoriId={favoriId}
            />

            <RecordCard
              title="Le Chat Noir"
              icon={<Skull className="text-zinc-500" size={24} />}
              data={topByMetric(playerStats, p => p.maxLossStreak)}
              valueKey="maxLossStreak"
              suffix="Matchs sans victoire"
              color="border-zinc-700 bg-zinc-900 text-zinc-400"
              favoriId={favoriId}
            />

            <RecordCard
              title="Nerfs d'Acier"
              icon={<HeartPulse className="text-red-500" size={24} />}
              data={topByMetric(playerStats, p => p.clutchWins)}
              valueKey="clutchWins"
              suffix="Victoires sur le fil (13-12)"
              color="border-red-500/30 bg-red-500/5 text-red-500"
              favoriId={favoriId}
            />

            <RecordCard
              title="Tireur d'Élite"
              icon={<Crosshair className="text-orange-500" size={24} />}
              data={playerStats.filter(p => p.tireurMatches >= 5).sort((a, b) => Number(b.tireurWinrate) - Number(a.tireurWinrate))[0]}
              valueKey="tireurWinrate"
              suffix="% de victoire au tir"
              color="border-orange-500/30 bg-orange-500/5 text-orange-500"
              nameColor="text-orange-500"
              favoriId={favoriId}
            />

            <RecordCard
              title="Le Sommet ELO"
              icon={<Crown className="text-yellow-500" size={24} />}
              data={topByMetric(playerStats, p => Number(p.peakElo))}
              valueKey="peakElo"
              suffix="Record ELO absolu"
              color="border-yellow-500/30 bg-yellow-500/5 text-yellow-500"
              favoriId={favoriId}
            />

            <RecordCard
              title="Le Rouleau Compresseur"
              icon={<Rocket className="text-green-500" size={24} />}
              data={topByMetric(playerStats, p => p.pointsPour)}
              valueKey="pointsPour"
              suffix="Points marqués au total"
              color="border-green-500/30 bg-green-500/5 text-green-500"
              favoriId={favoriId}
            />

            <RecordCard
              title="Le Punching-Ball"
              icon={<ShieldOff className="text-rose-500" size={24} />}
              data={topByMetric(playerStats, p => p.pointsContre)}
              valueKey="pointsContre"
              suffix="Points encaissés au total"
              color="border-rose-500/30 bg-rose-500/5 text-rose-500"
              favoriId={favoriId}
            />

            <RecordCard
              title="Le Bourreau"
              icon={<Swords className="text-red-600" size={24} />}
              data={topByMetric(playerStats, p => p.fannyGiven)}
              valueKey="fannyGiven"
              suffix="Fanny infligées (13-0)"
              color="border-red-600/30 bg-red-600/5 text-red-600"
              favoriId={favoriId}
            />

            <RecordCard
              title="Roi de la Fanny"
              icon={<Frown className="text-zinc-400" size={24} />}
              data={topByMetric(playerStats, p => p.fannyTaken)}
              valueKey="fannyTaken"
              suffix="Fanny subies (0-13)"
              color="border-zinc-500/30 bg-zinc-500/5 text-zinc-400"
              favoriId={favoriId}
            />

            <RecordCard
              title="Pointeur d'Élite"
              icon={<Focus className="text-purple-500" size={24} />}
              data={playerStats.filter(p => p.pointeurMatches >= 5).sort((a, b) => Number(b.pointeurWinrate) - Number(a.pointeurWinrate))[0]}
              valueKey="pointeurWinrate"
              suffix="% de victoire au pointage"
              color="border-purple-500/30 bg-purple-500/5 text-purple-500"
              nameColor="text-purple-500"
              favoriId={favoriId}
            />

            <RecordCard
              title="L'Increvable"
              icon={<Activity className="text-white" size={24} />}
              data={topByMetric(playerStats, p => p.matches)}
              valueKey="matches"
              suffix="Matchs joués au total"
              color="border-white/10 bg-white/5 text-white"
              favoriId={favoriId}
            />

            <RecordCard
              title="Le Diplomate"
              icon={<Handshake className="text-cyan-400" size={24} />}
              data={topByMetric(playerStats, p => p.draws)}
              valueKey="draws"
              suffix="Matchs nuls"
              color="border-cyan-500/30 bg-cyan-500/5 text-cyan-400"
              favoriId={favoriId}
            />

            <RecordCard
              title="Le Serial Vainqueur"
              icon={<Medal className="text-amber-500" size={24} />}
              data={topByMetric(playerStats, p => p.wins)}
              valueKey="wins"
              suffix="Victoires au total"
              color="border-amber-500/30 bg-amber-500/5 text-amber-500"
              favoriId={favoriId}
            />

            <RecordCard
              title="L'Abonné"
              icon={<ThumbsDown className="text-red-400" size={24} />}
              data={topByMetric(playerStats, p => p.losses)}
              valueKey="losses"
              suffix="Défaites au total"
              color="border-red-900/30 bg-red-900/10 text-red-400"
              favoriId={favoriId}
            />

            <RecordCard
              title="Le Fébrile"
              icon={<Thermometer className="text-orange-500" size={24} />}
              data={topByMetric(playerStats, p => p.closeLosses)}
              valueKey="closeLosses"
              suffix="Défaites sur le fil (11 ou 12-13)"
              color="border-orange-500/30 bg-orange-500/5 text-orange-500"
              favoriId={favoriId}
            />

          </div>
        )}
        {/* ONGLET RECORDS & TROPHÉES */}
        {activeTab === 'évolution' && (
          <div className="flex flex-col min-w-0 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-300">
            <p className="text-zinc-400 font-bold text-sm uppercase tracking-[0.5em] pl-1">
              Progression historique — {nbYears} Saisons - {timeline.length} Matchs
            </p>
            {/* Container du Graphique */}
            <div className="relative h-[70vh] w-full bg-zinc-900/10 rounded-[3rem] border border-white/5 p-6 backdrop-blur-3xl overflow-hidden">
              {/* Effet de lueur en arrière-plan */}
              <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-red-600/5 blur-[120px] pointer-events-none" />
              
              <GlobalProgressionChart
                timeline={timeline}
                allPlayerNames={allPlayerNames}
              />
            </div>
          </div>
        )}

        {/* ONGLET POPULARITÉ */}
        {activeTab === 'popularité' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">

            {/* PAGE LA PLUS CONSULTÉE */}
            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem] md:col-span-2">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Eye className="text-red-600" size={18} />
                Page la plus consultée
              </h3>
              {popularity.topPage ? (
                <div className="flex items-end justify-between">
                  <div className="text-2xl font-black italic uppercase tracking-tighter">
                    {prettyPath(popularity.topPage.path)}
                  </div>
                  <div className="text-xl font-black text-red-600">
                    {popularity.topPage.count} <span className="text-xs font-bold text-zinc-500 uppercase">vues</span>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Aucune donnée</p>
              )}
            </div>

            {/* TOP 3 JOUEURS CONSULTÉS */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Users className="text-yellow-500" size={18} />
                  Joueurs les plus consultés
                </h3>
              </div>
              {popularity.topPlayers.length === 0 ? (
                <p className="p-6 text-zinc-400 text-xs font-bold uppercase tracking-widest">Aucune donnée</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {popularity.topPlayers.map((p, idx) => (
                    <Link
                      key={p.id}
                      href={`/joueurs/${p.id}`}
                      className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center justify-center w-7 h-7 rounded-full font-black text-black text-xs ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-zinc-300' : 'bg-amber-700'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-black italic uppercase text-sm">{p.nom} <FavoriStar active={p.id === favoriId} /></span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 group-hover:text-red-600 transition-colors">
                        <span className="text-sm font-bold">{p.count}</span>
                        <ArrowUpRight size={14} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* TOURNOI LE PLUS CONSULTÉ */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6 flex flex-col justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <Trophy className="text-red-600" size={18} />
                Tournoi le plus consulté
              </h3>
              {popularity.topTournament ? (
                <Link
                  href={`/tournois/${popularity.topTournament.year}`}
                  className="flex items-end justify-between group"
                >
                  <div className="text-2xl font-black italic uppercase tracking-tighter group-hover:text-red-600 transition-colors flex items-center gap-2">
                    {popularity.topTournament.year}
                    <ArrowUpRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-xl font-black text-red-600">
                    {popularity.topTournament.count} <span className="text-xs font-bold text-zinc-500 uppercase">vues</span>
                  </div>
                </Link>
              ) : (
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Aucune donnée</p>
              )}
            </div>

            {/* PHOTO LA PLUS REGARDÉE */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden md:col-span-2">
              <div className="p-6 pb-4">
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <ImageIcon className="text-red-600" size={18} />
                  Photo la plus regardée
                </h3>
              </div>
              {popularity.topPhoto?.url ? (
                <a
                  href={popularity.topPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-[3/1] block overflow-hidden"
                >
                  <img
                    src={popularity.topPhoto.url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 right-6 text-xl font-black text-white">
                    {popularity.topPhoto.count} <span className="text-xs font-bold text-zinc-300 uppercase">vues</span>
                  </div>
                </a>
              ) : (
                <p className="px-6 pb-6 text-zinc-400 text-xs font-bold uppercase tracking-widest">Aucune donnée</p>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

// --- SOUS COMPOSANTS ---

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-2">
      <div className={`${color} opacity-80`}>{icon}</div>
      <div className="text-2xl font-black italic tracking-tighter">{value}</div>
      <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">{label}</div>
    </div>
  );
}

function RecordCard({ title, icon, data, valueKey, suffix, color, nameColor, favoriId }: any) {
  if (!data) return null; // Sécurité si aucune donnée

  // Déduit la couleur de la vague de lumière à partir de la classe text-{couleur}-{nuance}
  // déjà passée dans `color`, pour rester dans le ton de chaque vignette.
  const shadeMatch = color.match(/text-([a-z]+)-(\d{2,3})\b/);
  const glowColor = shadeMatch
    ? `var(--color-${shadeMatch[1]}-${shadeMatch[2]})`
    : /text-white\b/.test(color) ? '#ffffff' : 'transparent';

  return (
    <div
      className={`record-card-wave p-6 rounded-[2.5rem] border ${color} flex flex-col justify-between min-h-[160px]`}
      style={{ '--glow-color': glowColor } as React.CSSProperties}
    >
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h3 className="text-sm font-black uppercase tracking-widest">{title}</h3>
      </div>

      <div>
        <div className={`text-3xl font-black italic tracking-tighter uppercase ${nameColor || 'text-white'}`}>
          {data.name} <FavoriStar active={data.id === favoriId} size={18} />
        </div>
        <div className="text-lg font-bold mt-1">
          {data[valueKey]} <span className="text-xs font-normal uppercase tracking-widest opacity-70">{suffix}</span>
        </div>
      </div>
    </div>
  );
}