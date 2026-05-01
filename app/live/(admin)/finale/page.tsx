'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import RenderStepper from '@/components/Stepper';
import { updateMatchScore, calculateMatchImpact, parseSettings } from '@/utils/elo-logic';
import { ArrowLeft, ArrowRight, Save, Trophy, Loader2, Edit2, Swords, CheckCircle2 } from 'lucide-react';

export default function LiveDemiPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [demiMatches, setDemiMatches] = useState<any[]>([]);
  const [pouleMatches, setPouleMatches] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string>('FINALE');
  
  const [localScores, setLocalScores] = useState<Record<number, { s1: number | '', s2: number | '' }>>({});
  const [savingMatch, setSavingMatch] = useState<number | null>(null);
  const [eloSettings, setEloSettings] = useState<any>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: tournoi } = await supabase.from('live_tournament').select('status').eq('id', 1).single();
    if (tournoi) {
      setStatus(tournoi.status);
    }

    const { data: sData } = await supabase.from('settings').select('*');
	if (sData) {
      const parsed = parseSettings(sData || []);
      setEloSettings(parsed);
    }

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
      
      const scores: Record<number, { s1: number | '', s2: number | '' }> = {};
      allMatches.filter(m => m.type.toLowerCase().includes('inale')).forEach(m => {
        scores[m.id] = {
          s1: m.score_team1 !== null ? m.score_team1 : '',
          s2: m.score_team2 !== null ? m.score_team2 : ''
        };
      });
      setLocalScores(scores);
    }
    setLoading(false);
  };

  // Logique de fin de tournoi
  const completeTournament = async () => {
    setCompleting(true);
    // 1. On passe le statut en TERMINE
    const { error } = await supabase
      .from('live_tournament')
      .update({ status: 'TERMINE' })
      .eq('id', 1);

    if (!error) {
      // 2. On redirige vers la page du podium / palmarès
      router.push('/live/podium');
    } else {
      setCompleting(false);
    }
  };

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

  const handleScoreChange = (matchId: number, team: 1 | 2, value: string) => {
    const numValue = value === '' ? '' : parseInt(value, 10);
    setLocalScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [team === 1 ? 's1' : 's2']: numValue } }));
  };

  const saveMatchResult = async (matchId: number) => {
    const scores = localScores[matchId];
    if (scores.s1 === '' || scores.s2 === '') return;
    setSavingMatch(matchId);
	try {
	    // Appel de la fonction commune
	    const updatedMatch = await updateMatchScore(
	      supabase,
	      matchId,
	      Number(scores.s1),
	      Number(scores.s2),
	      eloSettings // Récupéré au chargement de la page
	    );

	    // Mise à jour de l'état local (identique pour toutes les pages)
	    setMatches(prev => prev.map(m => m.id === matchId ? updatedMatch : m));

	  } catch (error: any) {
	    console.error(error);
	    alert("Erreur : " + error.message);
	  } finally {
	    setSavingMatch(null);
	  }
	};

  const unlockMatch = async (matchId: number) => {
    setSavingMatch(matchId);
    const { error } = await supabase.from('live_matches').update({ status: 'EN_COURS' }).eq('id', matchId);
    if (!error) setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'EN_COURS' } : m));
    setSavingMatch(null);
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

  const renderDemiSummary = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        {['Principal', 'Honneur'].map(tableau => (
          <div key={tableau} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase italic text-zinc-500">
              <Swords size={12} /> Demis {tableau}
            </div>
            <div className="space-y-2">
              {demiMatches.filter(m => m.tableau === tableau).map(m => {
                const t1 = teams.find(t => t.id === m.team1_id);
                const t2 = teams.find(t => t.id === m.team2_id);
                const win1 = m.score_team1 > m.score_team2;
                return (
                  <div key={m.id} className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5 text-[11px]">
                    <span className={`flex-1 truncate uppercase ${win1 ? 'text-white font-bold' : 'text-zinc-500'}`}>
                      {playersMap[t1?.pointeur_id]?.split(' ')[0]} / {playersMap[t1?.tireur_id]?.split(' ')[0]}
                    </span>
                    <div className="flex items-center gap-2 px-3 font-black italic">
                      <span className={win1 ? 'text-red-500' : 'text-zinc-600'}>{m.score_team1}</span>
                      <span className="text-zinc-800">-</span>
                      <span className={!win1 ? 'text-red-500' : 'text-zinc-600'}>{m.score_team2}</span>
                    </div>
                    <span className={`flex-1 truncate text-right uppercase ${!win1 ? 'text-white font-bold' : 'text-zinc-500'}`}>
                      {playersMap[t2?.pointeur_id]?.split(' ')[0]} / {playersMap[t2?.tireur_id]?.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTableauSection = (tableauName: 'Principal') => {
    const tableauMatches = matches.filter(m => m.tableau === tableauName);
    return (
      <div className="p-6 md:p-8 rounded-[2rem] border border-white/5 bg-zinc-900/20 mb-8">
        <h2 className="text-xl font-black uppercase italic text-white flex items-center gap-3 mb-6">
          <Trophy size={20} className="text-red-600" /> Finale...
        </h2>
        <div className="space-y-4">
          {tableauMatches.map(m => {
            const isTermine = m.status === 'TERMINE';
            const s = localScores[m.id] || { s1: '', s2: '' };
            const t1 = teams.find(t => t.id === m.team1_id);
            const t2 = teams.find(t => t.id === m.team2_id);
            return (
              <div key={m.id} className={`p-4 rounded-xl border ${isTermine ? 'bg-red-600/5 border-red-600/20' : 'bg-black border-white/10'} flex items-center justify-between gap-4`}>
                  <div className="flex-1 text-right min-w-0">
                    <div className="text-[10px] text-zinc-500 font-black">#{m.team1_id}</div>
                    <div className="text-[11px] md:text-[14px] font-bold uppercase truncate leading-tight">
                        {playersMap[t1?.pointeur_id] || t1?.pointeur_id}<br className="md:hidden" /> 
                        <span className="hidden md:inline"> & </span> 
                        {playersMap[t1?.tireur_id] || t1?.tireur_id}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 bg-zinc-900 p-1 md:p-2 rounded-lg md:rounded-xl">
                    <input type="number" inputMode="numeric" value={s.s1} onChange={(e) => handleScoreChange(m.id, 1, e.target.value)} disabled={isTermine} className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none" />
                    <span className="text-zinc-600 font-bold">-</span>
                    <input type="number" inputMode="numeric" value={s.s2} onChange={(e) => handleScoreChange(m.id, 2, e.target.value)} disabled={isTermine} className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[10px] text-zinc-500 font-black">#{m.team2_id}</div>
                    <div className="text-[11px] md:text-[14px] font-bold uppercase truncate leading-tight">
                        {playersMap[t2?.pointeur_id] || t2?.pointeur_id}<br className="md:hidden" />
                        <span className="hidden md:inline"> & </span> 
                        {playersMap[t2?.tireur_id] || t2?.tireur_id}
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    {isTermine ? (
                      <button onClick={() => unlockMatch(m.id)} className="text-red-500 p-1 hover:text-white transition-colors">
                        <Edit2 size={20} className="md:w-6 md:h-6" />
                      </button>
                    ) : (
                      <button onClick={() => saveMatchResult(m.id)} disabled={savingMatch === m.id} className={'p-2 rounded-lg text-white transition-all bg-purple-500 active:bg-purple-700'}>
                        {savingMatch === m.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                    )}
                  </div>
                </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-black animate-pulse italic uppercase">Chargement...</div>;

  const allFinished = matches.length >= 2 && matches.every(m => m.status === 'TERMINE');

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 md:mb-12 flex justify-between items-center border-b border-white/10 pb-6 md:pb-8 group">
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter group-hover:text-red-600">
            Live <span className="text-red-600 group-hover:text-white">Finales</span>
          </h1>
			 <div className="flex flex-cols">
			   <button onClick={() => router.push('/live/demi')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
			     <ArrowLeft size={14} /> <span className="hidden md:inline">demi</span>
			   </button>
			   <button onClick={() => router.push('/live/podium')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
			     <ArrowRight size={14} /> <span className="hidden md:inline">podium</span>
			   </button>
			 </div>
        </header>

        <RenderStepper currentStatus = {status} />

        {allFinished && (
           <div className="mb-12 p-6 rounded-[2rem] bg-red-600 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_40px_rgba(220,38,38,0.3)] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-black uppercase italic text-white leading-none mb-1">Tournoi Terminé !</h3>
              <p className="text-red-100 font-bold text-xs uppercase">Les champions sont connus</p>
            </div>
            <button 
              onClick={completeTournament}
              disabled={completing}
              className="w-full md:w-auto bg-black text-white px-8 py-3 rounded-xl font-black uppercase text-sm tracking-tighter hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
               {completing ? <Loader2 size={18} className="animate-spin" /> : "Consulter le Palmarès"}
            </button>
          </div>
        )}

        {renderTableauSection('Principal')}

        {renderDemiSummary()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {renderStandingsMini('Gassin')}
          {renderStandingsMini('Ramatuelle')}
        </div>
      </div>
    </div>
  );
}
