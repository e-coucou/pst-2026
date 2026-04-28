'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Trophy, Swords, Medal, ArrowLeft, Loader2, Star, List } from 'lucide-react';

export default function PodiumPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [demiMatches, setDemiMatches] = useState<any[]>([]);
  const [pouleMatches, setPouleMatches] = useState<any[]>([]);
  const [stepValues, setStepValues] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase.from('profiles').select('id, nom');
      const pMap: Record<number, string> = {};
      if (profilesData) profilesData.forEach(p => pMap[p.id] = p.nom);
      setPlayersMap(pMap);

      const { data: teamsData } = await supabase.from('live_teams').select('*').neq('id', 'Z');
      if (teamsData) setTeams(teamsData);

      const { data: allMatches } = await supabase.from('live_matches').select('*').order('id', { ascending: true });
      if (allMatches) {
        setMatches(allMatches.filter(m => m.type.toLowerCase().includes('inale')));
        setDemiMatches(allMatches.filter(m => m.type === 'Demi'));
        setPouleMatches(allMatches.filter(m => m.type === 'Poule'));      
      }

      const { data: steps } = await supabase.from('steps').select('id, value');
      if (steps) setStepValues(steps);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const finalTop8 = useMemo(() => {
    const results: any[] = [];
    const stepsMap = stepValues.reduce((acc, s) => ({ ...acc, [s.id]: s.value }), {});

    matches.forEach(m => {
      const baseRank = stepsMap[m.type];
      if (baseRank !== undefined) {
        const isTeam1Winner = (m.score_team1 ?? 0) > (m.score_team2 ?? 0);
        const t1 = teams.find(t => t.id === m.team1_id);
        const t2 = teams.find(t => t.id === m.team2_id);

        if (t1) results.push({ rank: isTeam1Winner ? baseRank : baseRank + 1, team: t1, type: m.type });
        if (t2) results.push({ rank: isTeam1Winner ? baseRank + 1 : baseRank, team: t2, type: m.type });
      }
    });
    return results.sort((a, b) => a.rank - b.rank);
  }, [matches, stepValues, teams]);

  const calculateStandings = (pouleName: string) => {
    const pouleTeams = teams.filter(t => t.poule === pouleName);
    const pMatches = pouleMatches.filter(m => m.poule === pouleName && m.status === 'TERMINE');
    const standings = pouleTeams.map(t => ({
      id: t.id,
      pName: playersMap[t.pointeur_id] || `ID:${t.pointeur_id}`,
      tName: playersMap[t.tireur_id] || `ID:${t.tireur_id}`,
      pts: 0, diff: 0
    }));
    pMatches.forEach(m => {
      const t1 = standings.find(s => s.id === m.team1_id);
      const t2 = standings.find(s => s.id === m.team2_id);
      if (t1 && t2) {
        t1.diff += (m.score_team1 - m.score_team2);
        t2.diff += (m.score_team2 - m.score_team1);
        if (m.score_team1 > m.score_team2) t1.pts += 3;
        else if (m.score_team2 > m.score_team1) t2.pts += 3;
        else { t1.pts += 1; t2.pts += 1; }
      }
    });
    return standings.sort((a, b) => b.pts - a.pts || b.diff - a.diff);
  };

  const renderStandingsMini = (pouleName: string) => {
    const standings = calculateStandings(pouleName);
    return (
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
        <div className="bg-zinc-800/50 px-4 py-2 text-[10px] font-black uppercase italic text-zinc-400 border-b border-white/5">Poule {pouleName}</div>
        <table className="w-full text-[11px]">
          <tbody>
            {standings.map((s, idx) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0">
                <td className="p-2 text-zinc-500 w-6">{idx + 1}.</td>
                <td className="p-2 uppercase font-bold text-zinc-300">{s.pName.split(' ')[0]} / {s.tName.split(' ')[0]}</td>
                <td className="p-2 text-right font-black text-red-500">{s.pts} pts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-600 font-black animate-pulse uppercase gap-4">
      <Loader2 className="animate-spin" size={40} />
      Génération du Palmarès...
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12 pb-32">
      <div className="max-w-4xl mx-auto">
        
        <header className="mb-12 text-center">
          <div className="flex justify-center mb-4">
            <Trophy size={48} className="text-red-600" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none mb-2">
            Palmarès <span className="text-red-600">Final</span>
          </h1>
          <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Saison 2024 • Tournament Completed</p>
        </header>

        {/* 1. CLASSEMENT DES 8 ÉQUIPES */}
        <section className="mb-20">
          <div className="bg-zinc-900/50 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-zinc-800/50 p-6 border-b border-white/5 flex items-center gap-4">
              <Medal className="text-red-600" size={24} />
              <h2 className="text-xl font-black uppercase italic">Classement Officiel</h2>
            </div>
            <div className="p-4 md:p-8 space-y-2">
              {finalTop8.map((r, idx) => (
                <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${r.rank === 1 ? 'bg-red-600/20 border-red-600' : 'bg-black/40 border-white/5'}`}>
                  <div className={`text-2xl font-black italic w-10 ${r.rank <= 3 ? 'text-red-600' : 'text-zinc-700'}`}>
                    {r.rank}°
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-black uppercase text-zinc-500 mb-1">{r.type}</div>
                    <div className="text-sm md:text-lg font-bold uppercase truncate">
                      {playersMap[r.team?.pointeur_id]?.split(' ')[0]} <span className="text-red-600">&</span> {playersMap[r.team?.tireur_id]?.split(' ')[0]}
                    </div>
                  </div>
                  {r.rank === 1 && <Star size={20} fill="currentColor" className="text-red-600 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. MATCHES DES FINALES */}
        <section className="mb-16">
          <h3 className="text-xs font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-zinc-800"></div> Scores des Finales <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map(m => {
              const t1 = teams.find(t => t.id === m.team1_id);
              const t2 = teams.find(t => t.id === m.team2_id);
              return (
                <div key={m.id} className="bg-zinc-900/30 border border-white/5 p-5 rounded-2xl flex flex-col items-center gap-3">
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">{m.type}</span>
                  <div className="flex items-center justify-between w-full font-bold uppercase text-[10px] md:text-[11px]">
                    <span className="flex-1 text-right truncate">
                      {playersMap[t1?.pointeur_id]?.split(' ')[0]} / {playersMap[t1?.tireur_id]?.split(' ')[0]}
                    </span>
                    <div className="mx-4 bg-black px-4 py-2 rounded-xl font-black text-xl border border-white/5 text-white">
                      {m.score_team1} - {m.score_team2}
                    </div>
                    <span className="flex-1 text-left truncate">
                      {playersMap[t2?.pointeur_id]?.split(' ')[0]} / {playersMap[t2?.tireur_id]?.split(' ')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. MATCHES DES DEMIS */}
        <section className="mb-16">
          <h3 className="text-xs font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-zinc-800"></div> Historique Demis <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-60">
            {demiMatches.map(m => {
              const t1 = teams.find(t => t.id === m.team1_id);
              const t2 = teams.find(t => t.id === m.team2_id);
              return (
                <div key={m.id} className="bg-zinc-900/10 p-3 rounded-xl border border-white/5 flex justify-between items-center text-[9px] md:text-[10px] font-bold italic uppercase">
                   <span className="flex-1 text-right truncate">
                    {playersMap[t1?.pointeur_id]?.split(' ')[0]} / {playersMap[t1?.tireur_id]?.split(' ')[0]}
                   </span>
                   <span className="text-zinc-600 mx-3">{m.score_team1} - {m.score_team2}</span>
                   <span className="flex-1 text-left truncate">
                    {playersMap[t2?.pointeur_id]?.split(' ')[0]} / {playersMap[t2?.tireur_id]?.split(' ')[0]}
                   </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. TABLEAUX DE POULES */}
        <section className="mb-16">
          <h3 className="text-xs font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-zinc-800"></div> Phase de Poules <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderStandingsMini('Gassin')}
            {renderStandingsMini('Ramatuelle')}
          </div>
        </section>

        {/* 5. NOUVEAU BLOC : TOUS LES MATCHES DE POULES */}
        <section className="mb-24">
          <h3 className="text-xs font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-zinc-800"></div> Détail des matches de poules <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {['Gassin', 'Ramatuelle'].map((poule) => (
              <div key={poule} className="space-y-2">
                <div className="text-[10px] font-black uppercase text-zinc-600 mb-3 ml-1 tracking-[0.2em]">Poule {poule}</div>
                {pouleMatches.filter(m => m.poule === poule).map(m => {
                  const t1 = teams.find(t => t.id === m.team1_id);
                  const t2 = teams.find(t => t.id === m.team2_id);
                  return (
                    <div key={m.id} className="flex items-center justify-between bg-zinc-900/20 p-2 px-3 rounded-lg border border-white/5 text-[9px] font-medium uppercase text-zinc-400 italic">
                      <span className="flex-1 text-right truncate">{playersMap[t1?.pointeur_id]?.split(' ')[0]} / {playersMap[t1?.tireur_id]?.split(' ')[0]}</span>
                      <span className="mx-3 font-black text-zinc-600">{m.score_team1} - {m.score_team2}</span>
                      <span className="flex-1 text-left truncate">{playersMap[t2?.pointeur_id]?.split(' ')[0]} / {playersMap[t2?.tireur_id]?.split(' ')[0]}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase italic text-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:bg-red-600 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={18} /> Quitter le Live
          </button>
        </div>

      </div>
    </div>
  );
}
