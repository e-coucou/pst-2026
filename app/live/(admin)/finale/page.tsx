'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import RenderStepper from '@/components/Stepper';
import PredictionModal from '@/components/PredictionModal';
import { updateMatchScore, calculateMatchImpact, parseSettings } from '@/utils/elo-logic';
import { ArrowLeft, ArrowRight, Brain, Save, Trophy, Loader2, Edit2, Swords, CheckCircle2 } from 'lucide-react';
import { logActivity } from '@/utils/log-activity';
import { calculatePouleStandings } from '@/utils/live-stats';
import PouleStandingsTable from '@/components/PouleStandingsTable';
import FavoriStar from '@/components/FavoriStar';
import { useFavoriId } from '@/hooks/useFavoriId';

export default function LiveDemiPage() {
  const supabase = createClient();
  const router = useRouter();
  const favoriId = useFavoriId();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [demiMatches, setDemiMatches] = useState<any[]>([]);
  const [pouleMatches, setPouleMatches] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string>('FINALE');
  const [format, setFormat] = useState<string>('classique');
  const [stepValues, setStepValues] = useState<any[]>([]);
  
  const [localScores, setLocalScores] = useState<Record<number, { s1: number | '', s2: number | '' }>>({});
  const [savingMatch, setSavingMatch] = useState<number | null>(null);
  const [eloSettings, setEloSettings] = useState<any>(null);
  const [completing, setCompleting] = useState(false);
  const [matchToPredict, setMatchToPredict] = useState<{match: any, t1: any, t2: any} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: tournoi } = await supabase.from('live_tournament').select('status, format').eq('id', 1).single();
    if (tournoi) {
      setStatus(tournoi.status);
      setFormat(tournoi.format || 'classique');
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

    const { data: steps } = await supabase.from('steps').select('id, value, label');
    if (steps) setStepValues(steps);

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
      logActivity(supabase, 'ADMIN_COMPLETE_TOURNAMENT');
      // 2. On redirige vers la page du podium / palmarès
      router.push('/live/podium');
    } else {
      setCompleting(false);
    }
  };

  const calculateStandings = (pouleName: string) => calculatePouleStandings(pouleName, teams, pouleMatches, playersMap);

  const handleScoreChange = (matchId: number, team: 1 | 2, value: string) => {
    const numValue = value === '' ? '' : parseInt(value, 10);
    setLocalScores(prev => ({ ...prev, [matchId]: { ...prev[matchId], [team === 1 ? 's1' : 's2']: numValue } }));
  };


  // Fonction générique pour éviter la répétition de code
  const executeAction = async (url: string) => {
    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        alert(`❌ Erreur : ${data.error}`);
      }
    } catch (err) {
      alert("❌ Erreur réseau");
    }
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
	    executeAction('/api/admin/live-elo');
	    logActivity(supabase, 'ADMIN_SAVE_SCORE', { match_id: matchId, score_team1: scores.s1, score_team2: scores.s2 });

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
    if (!error) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'EN_COURS' } : m));
      logActivity(supabase, 'ADMIN_UNLOCK_MATCH', { match_id: matchId });
    }
    setSavingMatch(null);
  };

  const renderStandingsMini = (pouleName: string, accentColor: 'orange' | 'purple') => (
    <PouleStandingsTable pouleName={pouleName} standings={calculateStandings(pouleName)} accentColor={accentColor} />
  );

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
                    <span className={`flex-1 truncate uppercase ${win1 ? 'font-bold' : 'opacity-50'}`}>
                      <span className="text-purple-400">{playersMap[t1?.pointeur_id]?.split(' ')[0]}</span> <FavoriStar active={t1?.pointeur_id === favoriId} size={10} /> / <span className="text-orange-400">{playersMap[t1?.tireur_id]?.split(' ')[0]}</span> <FavoriStar active={t1?.tireur_id === favoriId} size={10} />
                    </span>
                    <div className="flex items-center gap-2 px-3 font-black italic">
                      <span className={win1 ? 'text-red-500' : 'text-zinc-400'}>{m.score_team1}</span>
                      <span className="text-zinc-500">-</span>
                      <span className={!win1 ? 'text-red-500' : 'text-zinc-400'}>{m.score_team2}</span>
                    </div>
                    <span className={`flex-1 truncate text-right uppercase ${!win1 ? 'font-bold' : 'opacity-50'}`}>
                      <span className="text-purple-400">{playersMap[t2?.pointeur_id]?.split(' ')[0]}</span> <FavoriStar active={t2?.pointeur_id === favoriId} size={10} /> / <span className="text-orange-400">{playersMap[t2?.tireur_id]?.split(' ')[0]}</span> <FavoriStar active={t2?.tireur_id === favoriId} size={10} />
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

  // Libellé lisible d'un type de match (ex: 'Finale Rang1' -> 'Finale') : lit la colonne
  // `label` de la table `steps` si renseignée, sinon retombe sur le type brut.
  const stepLabelMap = useMemo(
    () => stepValues.reduce((acc, s) => ({ ...acc, [s.id]: s.label || s.id }), {} as Record<string, string>),
    [stepValues]
  );

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
                    <div className="text-sm text-red-500 font-black">#{m.team1_id}</div>
                    <div className="text-xs md:text-lg font-bold uppercase truncate leading-tight">
                        <span className="text-purple-500">{playersMap[t1?.pointeur_id] || t1?.pointeur_id} <FavoriStar active={t1?.pointeur_id === favoriId} /></span><br className="md:hidden" />
                        <span className="hidden md:inline"> & </span>
                        <span className="text-orange-500">{playersMap[t1?.tireur_id] || t1?.tireur_id} <FavoriStar active={t1?.tireur_id === favoriId} /></span>
                    </div>
                  </div>
                <div className="items-center text-center text-sm text-zinc-500">{stepLabelMap[m.type] || m.type}
                  <div className="flex items-center gap-1 md:gap-2 bg-zinc-900 p-1 md:p-2 rounded-lg md:rounded-xl">
                    <input type="number" inputMode="numeric" value={s.s1} onChange={(e) => handleScoreChange(m.id, 1, e.target.value)} disabled={isTermine} className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none" />
                    <span className="text-zinc-400 font-bold">-</span>
                    <input type="number" inputMode="numeric" value={s.s2} onChange={(e) => handleScoreChange(m.id, 2, e.target.value)} disabled={isTermine} className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none" />
                  </div>
				</div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm text-red-500 font-black">#{m.team2_id}</div>
                    <div className="text-xs md:text-lg font-bold uppercase truncate leading-tight">
                        <span className="text-purple-500">{playersMap[t2?.pointeur_id] || t2?.pointeur_id} <FavoriStar active={t2?.pointeur_id === favoriId} /></span><br className="md:hidden" />
                        <span className="hidden md:inline"> & </span>
                        <span className="text-orange-500">{playersMap[t2?.tireur_id] || t2?.tireur_id} <FavoriStar active={t2?.tireur_id === favoriId} /></span>
                    </div>
                  </div>
                  <div className="flex shrink-0 group">
				  {/* BOUTON IA : Positionné au-dessus et centré */}
				   {!isTermine && (
				    <button 
				      onClick={() => setMatchToPredict({ match: m, t1, t2 })}
				      className="mb-0 flex flex-col items-center gap-1 transition-all"
				    >
				      <div className="p-1.5 bg-zinc-800 rounded-full transition-colors  group-hover:bg-red-500 group-hover:scale-[1.3]">
				        <Brain size={20} className="text-zinc-500 group-hover:text-white md:h-6 " />
				      </div>
				    </button>
				   )}
				  </div>
                  <div className="flex shrink-0 group">
                    {isTermine ? (
                      <button onClick={() => unlockMatch(m.id)} disabled={savingMatch === m.id} className="text-red-500 p-1 hover:text-white transition-colors group-hover:scale-[1.3] disabled:opacity-40">
                        {savingMatch === m.id ? <Loader2 size={20} className="animate-spin" /> : <Edit2 size={20} className="md:w-6 md:h-6" />}
                      </button>
                    ) : (
                      <button onClick={() => saveMatchResult(m.id)} disabled={savingMatch === m.id} className={'p-2 rounded-lg text-white transition-all bg-purple-500 active:bg-purple-700 group-hover:scale-[1.3]'}>
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
			   <button onClick={() => router.push(format === '10_equipes' ? '/live/poules' : '/live/demi')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
			     <ArrowLeft size={14} /> <span className="hidden md:inline">{format === '10_equipes' ? 'poules' : 'demi'}</span>
			   </button>
			   <button onClick={() => router.push('/live/podium')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
			     <ArrowRight size={14} /> <span className="hidden md:inline">podium</span>
			   </button>
			 </div>
        </header>

        <RenderStepper currentStatus = {status} skipDemi={format === '10_equipes'} />

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

        {demiMatches.length > 0 && renderDemiSummary()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {renderStandingsMini('Gassin', 'orange')}
          {renderStandingsMini('Ramatuelle', 'purple')}
        </div>
		{/* MODALE DE PREDICTION */}
        {matchToPredict && (
          <PredictionModal 
            matchInfo={matchToPredict} 
            playersMap={playersMap}
            onClose={() => setMatchToPredict(null)} 
          />
        )}
        {/* FOOTER 
        <div className="fixed bottom-8 left-0 right-0 px-4 flex justify-center">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-2xl font-black uppercase italic text-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:bg-red-600 hover:text-white transition-all active:scale-95"
          >
            <ArrowLeft size={18} /> Quitter le Live
          </button>
        </div>
        */}
      </div>
    </div>


  );
}
