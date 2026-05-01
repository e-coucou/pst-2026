'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import RenderStepper from '@/components/Stepper';
import GlobalProgressionChart from '@/components/GlobalProgressionChart';
import { Brain, Trophy, Swords, Medal, ArrowLeft, Loader2, Star, List } from 'lucide-react';
import PredictionModal from '@/components/PredictionModal';
import { calculateTeamsStats } from '@/utils/live-stats';

const statusSteps = [
  { id: 'JOUEURS', label: 'Joueurs' },
  { id: 'EQUIPES', label: 'Equipes' },
  { id: 'POULES', label: 'Poules' },
  { id: 'DEMI', label: 'Demis' },
  { id: 'FINALE', label: 'Finales' },
  { id: 'TERMINE', label: 'Podium' }
];

export const dynamic = 'force-dynamic';

export default function PodiumPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [pmatches, setPMatches] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [demiMatches, setDemiMatches] = useState<any[]>([]);
  const [pouleMatches, setPouleMatches] = useState<any[]>([]);
  const [stepValues, setStepValues] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string>('TERMINE');
  const [season, setSeason] = useState<any[]>([]);
  const [matchToPredict, setMatchToPredict] = useState<{match: any, t1: any, t2: any} | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [allPlayerNames, setAllPlayerNames] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);


// --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    // On crée un canal de diffusion
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // On écoute tout : INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'live_matches',
        },
        () => fetchData() // Dès que ça bouge, on recharge tout
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_tournament',
        },
        () => fetchData() // Si le statut du tournoi change, on recharge
      )
      .subscribe();

    // NETTOYAGE : Très important pour éviter les fuites de mémoire
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]); // On ne l'exécute qu'une fois au montage

  const fetchData = async () => {
    setLoading(true);
    try {

      // --- AJOUT : VÉRIFICATION DU STATUT DU TOURNOI ---
      const { data: tournoi } = await supabase.from('live_tournament').select('status').eq('id', 1).single();
	  if (tournoi) {
	      setStatus(tournoi?.status);
	  }

      const { data: seasons } = await supabase.from('seasons').select('year, is_active');
      if (seasons) {
	      setSeason(seasons.filter(m => m.is_active === true)) }
    
      const { data: profilesData } = await supabase.from('profiles').select('id, nom');
      const pMap: Record<number, string> = {};
      if (profilesData) profilesData.forEach(p => pMap[p.id] = p.nom);
      setPlayersMap(pMap);

      const { data: teamsData } = await supabase.from('live_teams').select('*').neq('id', 'Z');
      if (teamsData) setTeams(teamsData);

      const { data: allMatches } = await supabase.from('live_matches').select('*').order('id', { ascending: true });
      if (allMatches) {
		const statusPriority : Record<string,number> = {
		    'EN_COURS': 1,
		    'TERMINE': 2,
		    'A_VENIR': 3 // Au cas où tu aurais ce statut
		  };

		  // 2. Créer une fonction de tri réutilisable
		  const sortByStatus = (a: any, b:any) => {
		    const priorityA = statusPriority[a.status] || 99;
		    const priorityB = statusPriority[b.status] || 99;
		    return priorityA - priorityB;
		  };
        setPMatches(allMatches);
        setMatches(allMatches.filter(m => m.type.toLowerCase().includes('inale')).sort(sortByStatus));
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


  // On lance les deux requêtes en parallèle pour la performance
  const [timelineRes, profilesRes, seasons] = await Promise.all([
    supabase.rpc('get_full_live'),
    supabase.from('live_selected').select('nom'),
    supabase.from('seasons').select('year').eq('is_active',true),
  ]);


  const nbYears = seasons.data ? new Set(seasons.data.map(g => g.year)).size : 0;

  // Debug : Vérification du nombre de matchs récupérés (dans ta console terminal)
  if (timelineRes.data) {
	setTimeline(timelineRes.data);
  }
  if (profilesRes.data) {
  	setAllPlayerNames( profilesRes.data?.map(p => p.nom).filter(Boolean) );
  	}




	    
  };

  const teamsStats = useMemo(() => 
	calculateTeamsStats(teams, pmatches), 
	[teams, pmatches]
  );


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
                <td className="p-2 text-zinc-500 w-6">#{idx + 1}</td>
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


  const currentStepIndex = statusSteps.findIndex(s => s.id === status);

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
          <p className="text-zinc-500 font-bold uppercase text-3xl md:text-4xl tracking-widest">• été {season[0].year} •</p>
        </header>

        <RenderStepper currentStatus = {status} />

        {/* 1. CLASSEMENT DES 8 ÉQUIPES */}
		{currentStepIndex >= statusSteps.findIndex(s => s.id === 'TERMINE') && (
        <section className="mb-20">
          <div className="bg-zinc-900/50 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="bg-zinc-800/50 p-6 border-b border-white/5 flex items-center gap-4">
              <Medal className="text-red-600" size={24} />
              <h2 className="text-xl font-black uppercase italic">Classement Final</h2>
            </div>
            <div className="p-4 md:p-8 space-y-2">
              {finalTop8.map((r, idx) => (
                <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${r.rank === 1 ? 'bg-red-600/20 border-red-600' : 'bg-black/40 border-white/5'}`}>
                  <div className={`text-2xl font-black italic w-10 ${r.rank <= 3 ? 'text-red-600' : 'text-zinc-700'}`}>
                    #{r.rank}
                  </div>
                  <div className="flex-1">
                    <div className="text-[9px] font-black uppercase text-zinc-500 mb-1">{r.type}</div>
                    <div className="text-sm md:text-lg font-bold uppercase truncate">
                      <span>
                        {playersMap[r.team?.pointeur_id]?.split(' ')[0]} <span className="text-red-600">&</span> {playersMap[r.team?.tireur_id]?.split(' ')[0]}
                      </span>
					  {/* Affichage des stats ELO */}
					  {(() => {
					    // On cherche les stats calculées pour cette équipe (r.team.id)
					    const stats = teamsStats.find(s => s.id === r.team?.id);
					    const delta = stats?.delta_elo || 0;
					    const pointeurElo = (r.team?.elo_start_pointeur || 0) + delta;
					    const tireurElo = (r.team?.elo_start_tireur || 0) + delta;

					    return (
					      <div className="flex items-center gap-2">
					        {/* Le ELO Final */}
					        <span className="text-xs font-black text-zinc-400">
					          {pointeurElo.toFixed(1)} & {tireurElo.toFixed(1)}
					        </span>
					        
					        {/* Le Badge de progression (+/-) */}
					        {delta !== 0 && (
					          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${delta > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
					            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
					          </span>
					        )}
					      </div>
					    );
					  })()}
                    </div>
                  </div>
                  {r.rank === 1 && <Star size={20} fill="currentColor" className="text-red-600 animate-pulse" />}
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* 2. MATCHES DES FINALES */}
        {currentStepIndex >= statusSteps.findIndex(s => s.id === 'FINALE') && (
        <section className="mb-16">
          <h3 className="text-sm font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-zinc-800"></div> Scores des Finales <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {matches.map(m => {
              const t1 = teams.find(t => t.id === m.team1_id);
              const t2 = teams.find(t => t.id === m.team2_id);
				return (
				  <div key={m.id} className={`border border-white/5 p-5 rounded-2xl flex flex-col items-center gap-3 ${m.status =='EN_COURS' ? 'bg-purple-500/20' : 'bg-zinc-500/10'}`}>
				    <span className="text-sm font-black text-red-600 uppercase tracking-widest">{m.type}</span>
				    
				    {/* Conteneur principal (La ligne) */}
				    <div className="flex items-center justify-between w-full font-bold uppercase text-sm md:text-md">
				      
				      {/* ÉQUIPE 1 - Bloc de gauche */}
				      {/* flex-1 : prend la moitié de l'espace dispo / text-right : justifie à droite / flex-col : empile sur 2 lignes */}
				      <div className="flex flex-col flex-1 text-right truncate space-y-0">
				        <span className="truncate">{playersMap[t1?.pointeur_id]?.split(' ')[0]}</span>
				        <span className="truncate">{playersMap[t1?.tireur_id]?.split(' ')[0]}</span>
				      </div>
						{/* SCORE - Bloc central avec bouton IA centré au-dessus */}
						<div className="shrink-0 mx-4 flex flex-col items-center justify-center min-w-[80px]">
						  
						  {/* BOUTON IA : Positionné au-dessus et centré */}
						  {m.status !== 'TERMINE' && (
						    <button 
						      onClick={() => setMatchToPredict({ match: m, t1, t2 })}
						      className="mb-2 flex flex-col items-center gap-1 group transition-all"
						    >
						      <div className="p-1.5 text-white bg-zinc-800 rounded-full group-hover:bg-red-600/20 group-hover:text-red-500 transition-colors">
						        <Brain size={16} className="text-zinc-500 group-hover:text-red-500" />
						      </div>
						      <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-600 group-hover:text-red-500">
						        IA Prono
						      </span>
						    </button>
						  )}

						  {/* LE SCORE */}
						  <div className="bg-black px-4 py-2 rounded-xl font-black text-xl border border-white/5 text-white text-center w-full">
						    {m.score_team1} - {m.score_team2}
						  </div>
						</div>


				      {/* ÉQUIPE 2 - Bloc de droite */}
				      {/* flex-1 : prend l'autre moitié / text-left : justifie à gauche / flex-col : empile sur 2 lignes */}
				      <div className="flex flex-col flex-1 text-left truncate space-y-0">
				        <span className="truncate">{playersMap[t2?.pointeur_id]?.split(' ')[0]}</span>
				        <span className="truncate">{playersMap[t2?.tireur_id]?.split(' ')[0]}</span>
				      </div>

				    </div>
				  </div>
				);
            })}
          </div>
        </section>
        )}

        {/* 3. MATCHES DES DEMIS */}
        {currentStepIndex >= statusSteps.findIndex(s => s.id === 'DEMI') && (
        <section className="mb-16">
          <h3 className="text-sm font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-zinc-800"></div> Scores des Demis <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {demiMatches.map(m => {
              const t1 = teams.find(t => t.id === m.team1_id);
              const t2 = teams.find(t => t.id === m.team2_id);

				return (
				  <div key={m.id} className="bg-zinc-900/30 border border-white/5 p-2 rounded-2xl flex flex-col items-center gap-3">
				    <span className="text-sm font-black text-red-600 uppercase tracking-widest">Tableau {m.tableau}</span>
				    
				    {/* Conteneur principal (La ligne) */}
				    <div className="flex items-center justify-between w-full font-bold uppercase text-sm md:text-md">
				      
				      {/* ÉQUIPE 1 - Bloc de gauche */}
				      {/* flex-1 : prend la moitié de l'espace dispo / text-right : justifie à droite / flex-col : empile sur 2 lignes */}
				      <div className="flex flex-col flex-1 text-right truncate space-y-0">
				        <span className="truncate">{playersMap[t1?.pointeur_id]?.split(' ')[0]}</span>
				        <span className="truncate">{playersMap[t1?.tireur_id]?.split(' ')[0]}</span>
				      </div>


						{/* SCORE - Bloc central avec bouton IA centré au-dessus */}
						<div className="shrink-0 mx-4 flex flex-col items-center justify-center min-w-[80px]">
						  
						  {/* BOUTON IA : Positionné au-dessus et centré */}
						  {m.status !== 'TERMINE' && (
						    <button 
						      onClick={() => setMatchToPredict({ match: m, t1, t2 })}
						      className="mb-2 flex flex-col items-center gap-1 group transition-all"
						    >
						      <div className="p-1.5 text-white bg-zinc-800 rounded-full group-hover:bg-red-600/20 group-hover:text-red-500 transition-colors">
						        <Brain size={16} className="text-zinc-500 group-hover:text-red-500" />
						      </div>
						      <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-600 group-hover:text-red-500">
						        IA Prono
						      </span>
						    </button>
						  )}

						  {/* LE SCORE */}
						  <div className="bg-black px-4 py-2 rounded-xl font-black text-xl border border-white/5 text-white text-center w-full">
						    {m.score_team1} - {m.score_team2}
						  </div>
						</div>


				      {/* ÉQUIPE 2 - Bloc de droite */}
				      {/* flex-1 : prend l'autre moitié / text-left : justifie à gauche / flex-col : empile sur 2 lignes */}
				      <div className="flex flex-col flex-1 text-left truncate space-y-0">
				        <span className="truncate">{playersMap[t2?.pointeur_id]?.split(' ')[0]}</span>
				        <span className="truncate">{playersMap[t2?.tireur_id]?.split(' ')[0]}</span>
				      </div>

				    </div>
				  </div>
				);

            })}
          </div>
        </section>
        )}

        {/* 4. TABLEAUX DE POULES */}
        {currentStepIndex >= statusSteps.findIndex(s => s.id === 'POULES') && (
        <section className="mb-16">
          <h3 className="text-sm font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-zinc-800"></div> Classement de Poules <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderStandingsMini('Gassin')}
            {renderStandingsMini('Ramatuelle')}
          </div>
        </section>
        )}

        {/* 5. TOUS LES MATCHES DE POULES */}
		{currentStepIndex >= statusSteps.findIndex(s => s.id === 'POULES') && (
        <section className="mb-24">
          <h3 className="text-xs font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-zinc-800"></div> Détail des matches de poules <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {['Gassin', 'Ramatuelle'].map((poule) => (
              <div key={poule} className="space-y-2">
                <div className="text-md font-black uppercase text-zinc-600 mb-3 ml-1 tracking-[0.2em]">{poule}</div>
                {pouleMatches.filter(m => m.poule === poule).map(m => {
                  const t1 = teams.find(t => t.id === m.team1_id);
                  const t2 = teams.find(t => t.id === m.team2_id);
				 return (
				   <div key={m.id} className="bg-zinc-900/30 border border-white/5 p-3 rounded-2xl flex flex-col items-center gap-1">
				     
				     {/* Conteneur principal (La ligne) */}
				     <div className="flex items-center justify-between w-full font-bold uppercase text-sm md:text-md">
				       
				       {/* ÉQUIPE 1 - Bloc de gauche */}
				       {/* flex-1 : prend la moitié de l'espace dispo / text-right : justifie à droite / flex-col : empile sur 2 lignes */}
				       <div className="flex flex-col flex-1 text-right truncate">
				         <span className="truncate">{playersMap[t1?.pointeur_id]?.split(' ')[0]}</span>
				         <span className="truncate">{playersMap[t1?.tireur_id]?.split(' ')[0]}</span>
				       </div>

				       {/* SCORE - Bloc central */}
				       {/* shrink-0 : empêche le score d'être écrasé par les noms longs */}


						{/* SCORE - Bloc central avec bouton IA centré au-dessus */}
						<div className="shrink-0 mx-4 flex flex-col items-center justify-center min-w-[80px]">
						  
						  {/* BOUTON IA : Positionné au-dessus et centré */}
						  {m.status !== 'TERMINE' && (
						    <button 
						      onClick={() => setMatchToPredict({ match: m, t1, t2 })}
						      className="mb-2 flex flex-col items-center gap-1 group transition-all"
						    >
						      <div className="p-1.5 text-white bg-zinc-800 rounded-full group-hover:bg-red-600/20 group-hover:text-red-500 transition-colors">
						        <Brain size={16} className="text-zinc-500 group-hover:text-red-500" />
						      </div>
						      <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-600 group-hover:text-red-500">
						        IA Prono
						      </span>
						    </button>
						  )}

						  {/* LE SCORE */}
						  <div className="bg-black px-4 py-2 rounded-xl font-black text-xl border border-white/5 text-white text-center w-full">
						    {m.score_team1} - {m.score_team2}
						  </div>
						</div>


				       {/* ÉQUIPE 2 - Bloc de droite */}
				       {/* flex-1 : prend l'autre moitié / text-left : justifie à gauche / flex-col : empile sur 2 lignes */}
				       <div className="flex flex-col flex-1 text-left truncate">
				         <span className="truncate">{playersMap[t2?.pointeur_id]?.split(' ')[0]}</span>
				         <span className="truncate">{playersMap[t2?.tireur_id]?.split(' ')[0]}</span>
				       </div>

				     </div>
				   </div>
				 );
                })}
              </div>
            ))}
          </div>
        </section>
        )}

        {/* Container du Graphique */}
        {/* 5. TOUS LES MATCHES DE POULES */}
		{currentStepIndex >= statusSteps.findIndex(s => s.id === 'POULES') && (
        <section className="mb-24">
          <h3 className="text-xs font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
            <div className="h-[1px] bg-zinc-800"></div> Détail des matches de poules <div className="h-[1px] flex-1 bg-zinc-800"></div>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
 

        <div className="relative h-[70vh] w-full bg-zinc-900/10 rounded-[3rem] border border-white/5 p-6 backdrop-blur-3xl overflow-hidden">
          {/* Effet de lueur en arrière-plan */}
          <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-red-600/5 blur-[120px] pointer-events-none" />
          
          <GlobalProgressionChart 
            timeline={timeline} 
            allPlayerNames={allPlayerNames} 
          />
        </div>

        </div>
        </section>
        )}
        

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
