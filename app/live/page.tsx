'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Radio, Trophy, Swords, Clock, Activity, Users } from 'lucide-react';

export default function PublicLivePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});

  // Charger les données initiales et s'abonner aux changements en temps réel
  useEffect(() => {
    fetchData();

    // 🔴 MAGIC TRICK : On écoute les changements dans la base de données en direct !
    const channel = supabase
      .channel('public-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_matches' }, (payload) => {
        console.log('Changement détecté dans les matches !', payload);
        fetchData(); // On recharge les données si un score change
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_teams' }, (payload) => {
        fetchData(); // On recharge si une équipe change de poule
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      // 1. Profils (pour les noms)
      const { data: profilesData } = await supabase.from('profiles').select('id, nom');
      const pMap: Record<number, string> = {};
      if (profilesData) profilesData.forEach(p => pMap[p.id] = p.nom);
      setPlayersMap(pMap);

      // 2. Équipes
      const { data: teamsData } = await supabase.from('live_teams').select('*').neq('id', 'Z');
      if (teamsData) setTeams(teamsData);

      // 3. Matches
      const { data: matchesData } = await supabase.from('live_matches').select('*').order('id', { ascending: false });
      if (matchesData) setMatches(matchesData);

    } catch (e) {
      console.error("Erreur de chargement", e);
    } finally {
      setLoading(false);
    }
  };

  // --- CALCUL DES CLASSEMENTS DE POULES ---
  const calculateStandings = (pouleName: string) => {
    const pouleTeams = teams.filter(t => t.poule === pouleName);
    const pouleMatches = matches.filter(m => m.poule === pouleName && m.status === 'TERMINE');
    
    const standings = pouleTeams.map(t => ({
      id: t.id,
      pName: playersMap[t.pointeur_id] || `ID:${t.pointeur_id}`,
      tName: playersMap[t.tireur_id] || `ID:${t.tireur_id}`,
      pts: 0, 
      diff: 0
    }));

    pouleMatches.forEach(m => {
      const t1 = standings.find(s => s.id === m.team1_id);
      const t2 = standings.find(s => s.id === m.team2_id);
      if (t1 && t2) {
        t1.diff += ((m.score_team1 || 0) - (m.score_team2 || 0));
        t2.diff += ((m.score_team2 || 0) - (m.score_team1 || 0));
        if ((m.score_team1 || 0) > (m.score_team2 || 0)) t1.pts += 3;
        else if ((m.score_team2 || 0) > (m.score_team1 || 0)) t2.pts += 3;
        else { t1.pts += 1; t2.pts += 1; }
      }
    });

    return standings.sort((a, b) => b.pts - a.pts || b.diff - a.diff);
  };

  const renderStandingsMini = (pouleName: string) => {
    const standings = calculateStandings(pouleName);
    return (
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-zinc-800/80 px-4 py-3 text-xs font-black uppercase italic text-white border-b border-white/5 flex items-center gap-2">
          <Users size={14} className="text-red-500" />
          Poule {pouleName}
        </div>
        <table className="w-full text-xs">
          <tbody>
            {standings.map((s, idx) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                <td className="p-3 text-zinc-500 w-8 font-bold">{idx + 1}.</td>
                <td className="p-3 uppercase font-bold text-zinc-200">
                  {s.pName.split(' ')[0]} <span className="text-red-500">/</span> {s.tName.split(' ')[0]}
                </td>
                <td className="p-3 text-right">
                  <span className="font-black text-white bg-zinc-800 px-2 py-1 rounded">{s.pts} pts</span>
                </td>
              </tr>
            ))}
            {standings.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-zinc-600 italic uppercase font-bold text-[10px]">
                  En attente des équipes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Séparation des matches en cours et terminés
  const ongoingMatches = matches.filter(m => m.status !== 'TERMINE');
  const finishedMatches = matches.filter(m => m.status === 'TERMINE').slice(0, 10); // Les 10 derniers

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 font-black animate-pulse uppercase gap-4">
        <Activity className="animate-spin" size={40} />
        Connexion au Live...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      
      {/* HEADER FIXE "EN DIRECT" */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
          </div>
          <h1 className="font-black italic uppercase tracking-widest text-sm">PST <span className="text-red-600">2026</span></h1>
        </div>
        <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
          <Radio size={12} /> Live Tracker
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-12 mt-4">

        {/* SECTION 1 : MATCHES EN COURS */}
        <section>
          <h2 className="text-sm font-black uppercase italic text-zinc-400 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-red-500" /> Matches en cours
          </h2>
          
          {ongoingMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ongoingMatches.map(m => {
                const t1 = teams.find(t => t.id === m.team1_id);
                const t2 = teams.find(t => t.id === m.team2_id);
                return (
                  <div key={m.id} className="bg-zinc-900/60 border border-red-900/30 p-4 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                    <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-3 flex justify-between">
                      <span>{m.type} {m.poule ? `- Poule ${m.poule}` : ''}</span>
                      <span className="animate-pulse">En cours</span>
                    </div>
                    <div className="flex items-center justify-between font-bold uppercase text-[11px]">
                      <span className="flex-1 text-right truncate">
                        {playersMap[t1?.pointeur_id]?.split(' ')[0]} / {playersMap[t1?.tireur_id]?.split(' ')[0]}
                      </span>
                      <div className="mx-3 bg-black px-3 py-1 rounded-lg font-black text-lg border border-red-900/50 text-white">
                        {m.score_team1 || 0} - {m.score_team2 || 0}
                      </div>
                      <span className="flex-1 text-left truncate">
                        {playersMap[t2?.pointeur_id]?.split(' ')[0]} / {playersMap[t2?.tireur_id]?.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl text-center text-zinc-600 text-xs font-bold uppercase italic">
              Aucun match en cours
            </div>
          )}
        </section>

        {/* SECTION 2 : CLASSEMENTS EN DIRECT */}
        <section>
          <h2 className="text-sm font-black uppercase italic text-zinc-400 mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-red-500" /> Classement des Poules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderStandingsMini('Gassin')}
            {renderStandingsMini('Ramatuelle')}
          </div>
        </section>

        {/* SECTION 3 : DERNIERS RÉSULTATS */}
        <section>
          <h2 className="text-sm font-black uppercase italic text-zinc-400 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-red-500" /> Derniers Résultats
          </h2>
          <div className="space-y-2">
            {finishedMatches.length > 0 ? finishedMatches.map(m => {
              const t1 = teams.find(t => t.id === m.team1_id);
              const t2 = teams.find(t => t.id === m.team2_id);
              const isT1Winner = (m.score_team1 || 0) > (m.score_team2 || 0);

              return (
                <div key={m.id} className="flex items-center justify-between bg-zinc-900/20 p-3 rounded-xl border border-white/5 text-[10px] font-medium uppercase italic">
                  <span className={`flex-1 text-right truncate ${isT1Winner ? 'text-white font-black' : 'text-zinc-500'}`}>
                    {playersMap[t1?.pointeur_id]?.split(' ')[0]} / {playersMap[t1?.tireur_id]?.split(' ')[0]}
                  </span>
                  
                  <div className="mx-4 font-black text-sm flex gap-2 items-center">
                    <span className={isT1Winner ? 'text-red-500' : 'text-zinc-600'}>{m.score_team1}</span>
                    <span className="text-zinc-700">-</span>
                    <span className={!isT1Winner ? 'text-red-500' : 'text-zinc-600'}>{m.score_team2}</span>
                  </div>

                  <span className={`flex-1 text-left truncate ${!isT1Winner ? 'text-white font-black' : 'text-zinc-500'}`}>
                    {playersMap[t2?.pointeur_id]?.split(' ')[0]} / {playersMap[t2?.tireur_id]?.split(' ')[0]}
                  </span>
                </div>
              );
            }) : (
              <div className="text-center text-zinc-600 text-xs font-bold uppercase italic p-4">
                Aucun match terminé pour le moment
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
