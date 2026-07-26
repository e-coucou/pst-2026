'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import RenderStepper from '@/components/Stepper';
import PredictionModal from '@/components/PredictionModal';
import { updateMatchScore, calculateMatchImpact, parseSettings } from '@/utils/elo-logic';
import { ArrowLeft, ArrowRight, Brain, Save, Trophy, Loader2, Edit2 } from 'lucide-react';
import { logActivity } from '@/utils/log-activity';
import { calculatePouleStandings } from '@/utils/live-stats';
import PouleStandingsTable from '@/components/PouleStandingsTable';

export default function LivePoulesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string>('POULES');
  const [format, setFormat] = useState<string>('classique');

  const [localScores, setLocalScores] = useState<Record<number, { s1: number | '', s2: number | '' }>>({});
  const [savingMatch, setSavingMatch] = useState<number | null>(null);
  const [eloSettings, setEloSettings] = useState<any>(null);
  const [matchToPredict, setMatchToPredict] = useState<{match: any, t1: any, t2: any} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: tournoi } = await supabase.from('live_tournament').select('status, format').eq('id', 1).single();
	if (tournoi) {
      setStatus(tournoi?.status);
      setFormat(tournoi?.format || 'classique');
    }

    const { data: sData } = await supabase.from('settings').select('*');
	if (sData) {
      const parsed = parseSettings(sData || []);
      setEloSettings(parsed);
    }
  
    const { data: profilesData } = await supabase.from('profiles').select('id, nom');
    const pMap: Record<number, string> = {};
    if (profilesData) {
      profilesData.forEach(p => pMap[p.id] = p.nom);
    }
    setPlayersMap(pMap);

    const { data: teamsData } = await supabase.from('live_teams').select('*').neq('id', 'Z');
    if (teamsData) setTeams(teamsData);

    const { data: matchesData } = await supabase
      .from('live_matches')
      .select('*')
      .eq('type', 'Poule')
      .order('id', { ascending: true });
      
    if (matchesData) {
      setMatches(matchesData);
      const scores: Record<number, { s1: number | '', s2: number | '' }> = {};
      matchesData.forEach(m => {
        scores[m.id] = {
          s1: m.score_team1 !== null ? m.score_team1 : '',
          s2: m.score_team2 !== null ? m.score_team2 : ''
        };
      });
      setLocalScores(scores);
    }
    setLoading(false);
  }; // end fetch

  const handleScoreChange = (matchId: number, team: 1 | 2, value: string) => {
    const numValue = value === '' ? '' : parseInt(value, 10);
    setLocalScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [team === 1 ? 's1' : 's2']: numValue }
    }));
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
    const { error } = await supabase
      .from('live_matches')
      .update({ status: 'EN_COURS' })
      .eq('id', matchId);

    if (!error) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, status: 'EN_COURS' } : m));
      logActivity(supabase, 'ADMIN_UNLOCK_MATCH', { match_id: matchId });
    }
    setSavingMatch(null);
  };

  const calculateStandings = (pouleName: string) => calculatePouleStandings(pouleName, teams, matches, playersMap);


  const generateDemis = async () => {
    const message = status === 'DEMI' || status === 'FINALE' 
      ? "Attention : Tu vas régénérer les demi-finales. Cela effacera TOUS les scores des demis et de la finale déjà enregistrés. Continuer ?"
      : "Générer les demi-finales ? Cette action verrouille les poules.";

    if (!confirm(message)) return;
    setLoading(true);
  
    try {
      // 1. On récupère les classements finaux
      const standingsGassin = calculateStandings('Gassin');
      const standingsRamatuelle = calculateStandings('Ramatuelle');
      // 2. NETTOYAGE TOTAL des phases finales
      // On supprime tout ce qui n'est pas 'Poule' (donc 'Demi' et 'Finale')
	  const { error: deleteError } = await supabase
  		.from('live_matches')
  		.delete()
  		.neq('type', 'Poule'); // Supprime TOUT sauf les matchs de poule
      if (deleteError) throw deleteError;
      // 3. Construction des matchs selon ta logique
      // Principal : G1 vs R2 et R1 vs G2
      // Honneur : G3 vs R4 et R3 vs G4
      const demiMatchs = [
        // PRINCIPAL
        { poule: '', tableau: 'Principal', team1_id: standingsGassin[0].id, team2_id: standingsRamatuelle[1].id, type: 'Demi', status: 'EN_COURS' },
        { poule: '', tableau: 'Principal', team1_id: standingsRamatuelle[0].id, team2_id: standingsGassin[1].id, type: 'Demi', status: 'EN_COURS' },
        // HONNEUR
        { poule: '', tableau: 'Honneur', team1_id: standingsGassin[2].id, team2_id: standingsRamatuelle[3].id, type: 'Demi', status: 'EN_COURS' },
        { poule: '', tableau: 'Honneur', team1_id: standingsRamatuelle[2].id, team2_id: standingsGassin[3].id, type: 'Demi', status: 'EN_COURS' },
      ];
  
      // 3. Insertion en base
      const { error: insertError } = await supabase.from('live_matches').insert(demiMatchs);
      if (insertError) throw insertError;
  
      // 4. Update du statut du tournoi
      await supabase.from('live_tournament').update({ status: 'DEMI' }).eq('id', 1);
      logActivity(supabase, 'ADMIN_GENERATE_DEMIS');

      // 5. Redirection
      router.push('/live/demi');
    } catch (err) {
      alert("Erreur lors de la génération : " + (err as any).message);
      setLoading(false);
    }
  };

  // Format "10 équipes" : pas de demi-finales, on va directement des poules (5 équipes chacune)
  // aux 5 finales classées (1er×1er, 2e×2e, ... 5e×5e), et le statut passe directement à FINALE.
  const generateFinalesClassees = async () => {
    const message = status === 'FINALE'
      ? "Attention : Tu vas régénérer les finales classées. Cela effacera TOUS les scores déjà enregistrés. Continuer ?"
      : "Générer les finales classées ? Cette action verrouille les poules.";

    if (!confirm(message)) return;
    setLoading(true);

    try {
      const standingsGassin = calculateStandings('Gassin');
      const standingsRamatuelle = calculateStandings('Ramatuelle');

      const { error: deleteError } = await supabase
        .from('live_matches')
        .delete()
        .neq('type', 'Poule');
      if (deleteError) throw deleteError;

      const finalesMatchs = standingsGassin.map((_, i) => ({
        poule: '',
        tableau: 'Principal',
        type: `Finale Rang${i + 1}`,
        team1_id: standingsGassin[i].id,
        team2_id: standingsRamatuelle[i].id,
        status: 'EN_COURS'
      }));

      const { error: insertError } = await supabase.from('live_matches').insert(finalesMatchs);
      if (insertError) throw insertError;

      // Saute directement à FINALE (pas de statut DEMI pour ce format)
      await supabase.from('live_tournament').update({ status: 'FINALE' }).eq('id', 1);
      logActivity(supabase, 'ADMIN_GENERATE_FINALES_CLASSEES');

      router.push('/live/finale');
    } catch (err) {
      alert("Erreur lors de la génération : " + (err as any).message);
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-black animate-pulse italic">CHARGEMENT...</div>;


// Calcul de la condition en dehors du rendu pour plus de clarté
	const allFinished = matches.length > 0 && matches.every(m => 
    	m.status?.trim().toUpperCase() === 'TERMINE'
  	);

  const renderPouleSection = (pouleName: string, accentColor: 'orange' | 'purple') => {
    const pouleMatches = matches.filter(m => m.poule === pouleName);
    const standings = calculateStandings(pouleName);
    const textColor = accentColor === 'orange' ? 'text-orange-500' : 'text-purple-500';
    const isG = pouleName === 'Gassin';

    return (
      <div className={`p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-white/5 mb-8 md:mb-12`}>
        <h2 className={`text-xl md:text-2xl font-black uppercase italic ${textColor} flex items-center gap-3 mb-6 md:mb-8`}>
          <Trophy size={20} className="md:w-6 md:h-6" /> Poule {pouleName}
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12">
          {/* MATCHS */}
          <div className="space-y-3 md:space-y-4">
            {pouleMatches.map(m => {
              const isTermine = m.status === 'TERMINE';
              const s = localScores[m.id] || { s1: '', s2: '' };
              const t1 = teams.find(t => t.id === m.team1_id);
              const t2 = teams.find(t => t.id === m.team2_id);

              return (
                <div key={m.id} className={`p-3 md:p-4 rounded-xl md:rounded-2xl border ${isTermine ? ( isG ? 'bg-orange-600/20 border-orange-600/50' : 'bg-purple-600/20 border-purple-500/50') : 'bg-black border-white/10'} flex items-center justify-between gap-2 md:gap-4`}>

                  {/* Team 1 */}
                  <div className="flex-1 text-right min-w-0">
                    <div className="text-[10px] text-zinc-500 font-black">#{m.team1_id}</div>
                    <div className="text-[11px] md:text-[14px] font-bold uppercase truncate leading-tight">
                        {playersMap[t1?.pointeur_id] || t1?.pointeur_id}<br className="md:hidden" /> 
                        <span className="hidden md:inline"> & </span> 
                        {playersMap[t1?.tireur_id] || t1?.tireur_id}
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="flex items-center gap-1 md:gap-2 bg-zinc-900 p-1 md:p-2 rounded-lg md:rounded-xl">
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={s.s1} 
                      onChange={(e) => handleScoreChange(m.id, 1, e.target.value)} 
                      disabled={isTermine} 
                      className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none" 
                    />
                    <span className="text-zinc-400 font-bold">-</span>
                    <input 
                      type="number" 
                      inputMode="numeric"
                      value={s.s2} 
                      onChange={(e) => handleScoreChange(m.id, 2, e.target.value)} 
                      disabled={isTermine} 
                      className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none" 
                    />
                  </div>

                  {/* Team 2 */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[10px] text-zinc-500 font-black">#{m.team2_id}</div>
                    <div className="text-[11px] md:text-[14px] font-bold uppercase truncate leading-tight">
                        {playersMap[t2?.pointeur_id] || t2?.pointeur_id}<br className="md:hidden" />
                        <span className="hidden md:inline"> & </span> 
                        {playersMap[t2?.tireur_id] || t2?.tireur_id}
                    </div>
                  </div>

                  {/* Actions */}
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
 
                  <div className="flex shrink-0">
                    {isTermine ? (
                      <button onClick={() => unlockMatch(m.id)} disabled={savingMatch === m.id} className="text-red-500 p-1 hover:text-white transition-colors disabled:opacity-40">
                        {savingMatch === m.id ? <Loader2 size={20} className="animate-spin" /> : <Edit2 size={20} className="md:w-6 md:h-6" />}
                      </button>
                    ) : (
                      <button 
                        onClick={() => saveMatchResult(m.id)} 
                        disabled={savingMatch === m.id} 
                        className={`p-2 rounded-lg text-white transition-all ${isG ? 'bg-orange-500 active:bg-orange-700' : 'bg-purple-500 active:bg-purple-700'}`}
                      >
                        {savingMatch === m.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* CLASSEMENT */}
          <PouleStandingsTable pouleName={pouleName} standings={standings} accentColor={accentColor} showHeader={false} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 md:mb-12 flex justify-between items-center border-b border-white/10 pb-6 md:pb-8 group">
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter group-hover:text-red-600">
            Live <span className="text-red-600 group-hover:text-white">Poules</span>
          </h1>
          <div className="flex flex-cols">
            <button onClick={() => router.push('/live/admin')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
              <ArrowLeft size={14} /> <span className="hidden md:inline">équipes</span>
            </button>
            <button onClick={() => router.push(format === '10_equipes' ? '/live/finale' : '/live/demi')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
              <ArrowRight size={14} /> <span className="hidden md:inline">{format === '10_equipes' ? 'finale' : 'demi'}</span>
			</button>
          </div>
        </header>

		<RenderStepper currentStatus = {status} skipDemi={format === '10_equipes'} />

        {/* SECTION BOUTON POUR LANCER LES DEMIS (classique) OU LES FINALES CLASSÉES (10 équipes) */}
        {allFinished && (
          <div className="mb-12 p-8 rounded-[2.5rem] bg-red-600 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-bounce-subtle">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-black uppercase italic text-white leading-none mb-2">Terminé !</h3>
              <p className="text-red-100 font-bold text-sm">
                {format === '10_equipes'
                  ? "Le classement est définitif. Prêt pour les finales classées ?"
                  : "Le classement est définitif. Prêt pour les demi-finales ?"}
              </p>
            </div>
            <button
              onClick={format === '10_equipes' ? generateFinalesClassees : generateDemis}
              disabled={loading}
              className="w-full md:w-auto bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Trophy size={20} />}
              {format === '10_equipes' ? 'Générer les Finales Classées' : 'Générer Demi-Finales'}
            </button>
          </div>
        )}
        {renderPouleSection('Gassin', 'orange')}
        {renderPouleSection('Ramatuelle', 'purple')}

		{/* MODALE DE PREDICTION */}
        {matchToPredict && (
          <PredictionModal 
            matchInfo={matchToPredict} 
            playersMap={playersMap}
            onClose={() => setMatchToPredict(null)} 
          />
        )}

      </div>
    </div>
  );

}
