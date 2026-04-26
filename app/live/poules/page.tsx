'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Save, Trophy, Loader2, Edit2 } from 'lucide-react';

export default function LivePoulesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string>('POULES');
  
  const [localScores, setLocalScores] = useState<Record<number, { s1: number | '', s2: number | '' }>>({});
  const [savingMatch, setSavingMatch] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: tournoi } = await supabase.from('live_tournament').select('status').eq('id', 1).single();
    if (!tournoi || tournoi.status !== 'POULES') {
	  setStatus(tournoi?.status);
      router.push('/admin/live'); 
      return;
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
  };

  const handleScoreChange = (matchId: number, team: 1 | 2, value: string) => {
    const numValue = value === '' ? '' : parseInt(value, 10);
    setLocalScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [team === 1 ? 's1' : 's2']: numValue }
    }));
  };

  const saveMatchResult = async (matchId: number) => {
    const scores = localScores[matchId];
    if (scores.s1 === '' || scores.s2 === '') return;

    setSavingMatch(matchId);
    try {
      const { error } = await supabase
        .from('live_matches')
        .update({
          score_team1: scores.s1,
          score_team2: scores.s2,
          status: 'TERMINE'
        })
        .eq('id', matchId);

      if (error) throw error;

      setMatches(prev => prev.map(m => 
        m.id === matchId ? { ...m, score_team1: scores.s1, score_team2: scores.s2, status: 'TERMINE' } : m
      ));
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
    }
    setSavingMatch(null);
  };

  const calculateStandings = (pouleName: string) => {
    const pouleTeams = teams.filter(t => t.poule === pouleName);
    const pouleMatches = matches.filter(m => m.poule === pouleName && m.status === 'TERMINE');

    const standings = pouleTeams.map(t => ({
      id: t.id,
      pName: playersMap[t.pointeur_id] ? playersMap[t.pointeur_id] : `ID:${t.pointeur_id}`,
      tName: playersMap[t.tireur_id] ? playersMap[t.tireur_id] : `ID:${t.tireur_id}`,
      j: 0, pts: 0, diff: 0, pPlus: 0
    }));

    pouleMatches.forEach(m => {
      const t1 = standings.find(s => s.id === m.team1_id);
      const t2 = standings.find(s => s.id === m.team2_id);
      if (t1 && t2) {
        t1.j++; t2.j++;
        t1.pPlus += m.score_team1; t1.diff += (m.score_team1 - m.score_team2);
        t2.pPlus += m.score_team2; t2.diff += (m.score_team2 - m.score_team1);
        if (m.score_team1 > m.score_team2) t1.pts += 3;
        else if (m.score_team2 > m.score_team1) t2.pts += 3;
        else { t1.pts += 1; t2.pts += 1; }
      }
    });

    return standings.sort((a, b) => (b.pts - a.pts) || (b.diff - a.diff) || (b.pPlus - a.pPlus));
  };


  const generateDemis = async () => {
    if (!confirm("Générer les demi-finales ? Cette action verrouille les poules.")) return;
    setLoading(true);
  
    try {
      // 1. On récupère les classements finaux
      const standingsGassin = calculateStandings('Gassin');
      const standingsRamatuelle = calculateStandings('Ramatuelle');
  
      // 2. Construction des matchs selon ta logique
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
  
      // 5. Redirection
      router.push('/admin/live/demi');
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


    {/* SECTION STEPPER */}
	const renderStepper = (currentStatus: string) => {
	  const steps = [
	    { id: 'JOUEURS', label: 'Joueurs' },
	    { id: 'EQUIPES', label: 'Equipes' },
	    { id: 'POULES', label: 'Poules' },
	    { id: 'DEMI', label: 'Demi-Finales' },
	    { id: 'FINALE', label: 'Finales' },
	    { id: 'TERMINE', label: 'Podium' }
	  ];

	  return (
	    <div className="flex items-center justify-between mb-12 w-full max-w-3xl mx-auto px-4">
	      {steps.map((step, idx) => {
	        const statusOrder = steps.map(s => s.id);
	        const currentIdx = statusOrder.indexOf(currentStatus);
	        const isPast = currentIdx > idx;
	        const isCurrent = step.id === currentStatus;
	        
	        return (
	          <div key={step.id} className="flex items-center flex-1 last:flex-none">
	            <div className="relative flex flex-col items-center">
	              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all duration-500 ${
	                isCurrent ? 'bg-orange-600 text-white ring-4 ring-orange-600/20 scale-110' : 
	                isPast ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-500'
	              }`}>
	                {isPast ? '✓' : idx + 1}
	              </div>
	              <span className={`absolute -bottom-7 text-[10px] font-black uppercase italic whitespace-nowrap tracking-tighter ${
	                isCurrent ? 'text-white' : 'text-zinc-600'
	              }`}>
	                {step.label}
	              </span>
	            </div>

	            {idx !== steps.length - 1 && (
	              <div className="flex-1 h-[2px] mx-4 bg-zinc-800">
	                <div 
	                  className={`h-full bg-purple-600 transition-all duration-1000 ${isPast ? 'w-full' : 'w-0'}`}
	                />
	              </div>
	            )}
	          </div>
	        );
	      })}
	    </div>
	  );
	};

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
                    <span className="text-zinc-600 font-bold">-</span>
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
                  <div className="flex shrink-0">
                    {isTermine ? (
                      <button onClick={() => unlockMatch(m.id)} className="text-red-500 p-1 hover:text-white transition-colors">
                        <Edit2 size={20} className="md:w-6 md:h-6" />
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
          <div className="bg-black border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[300px]">
                <thead>
                    <tr className="text-[10px] md:text-[12px] uppercase text-zinc-500 border-b border-white/10">
                    <th className="p-3 md:p-4 hidden md:table-cell">Rk</th>
                    <th className="p-3 md:p-4">Équipe</th>
                    <th className="p-3 md:p-4 text-center hidden md:table-cell">J</th>
                    <th className="p-3 md:p-4 text-center text-red-500">PTS</th>
                    <th className="p-3 md:p-4 text-center">Diff</th>
                    </tr>
                </thead>
                <tbody className="text-[12px] md:text-[14px] text-white font-bold">
                    {standings.map((s, idx) => (
                    <tr key={s.id} className={`border-2b border-white/5 last:border-0 ${idx < 2 ? ( isG ? 'bg-orange-500/10' : 'bg-purple-500/10') : ''}`}>
                        <td className="p-3 md:p-4 text-zinc-500">{idx + 1}.<span className="text-white">{s.id}</span></td>
                        <td className="p-3 md:p-4 uppercase text-zinc-300 truncate max-w-[100px] md:max-w-none">
                            <span className="text-[12px] md:text-[14px] text-white block md:inline md:mr-1">{s.pName.split(' ')[0]} / </span>
                            {s.tName.split(' ')[0]}
                        </td>
                        <td className="p-3 md:p-4 text-center text-zinc-500 hidden md:table-cell">{s.j}</td>
                        <td className="p-3 md:p-4 text-center text-white bg-white/5">{s.pts}</td>
                        <td className={`p-3 md:p-4 text-center ${s.diff > 0 ? 'text-green-500' : s.diff < 0 ? 'text-red-500' : ''}`}>
                            {s.diff > 0 ? `+${s.diff}` : s.diff}
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          </div>
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
          <button 
            onClick={() => router.push('/admin/live')} 
            className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-3 py-2 rounded-full"
          >
            <ArrowLeft size={14} /> <span className="hidden md:inline">Retour</span>
          </button>
        </header>

		{renderStepper(status)}

        {/* SECTION BOUTON POUR LANCER LES DEMIS */}
        {allFinished && (
          <div className="mb-12 p-8 rounded-[2.5rem] bg-red-600 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-bounce-subtle">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-black uppercase italic text-white leading-none mb-2">Terminé !</h3>
              <p className="text-red-100 font-bold text-sm">Le classement est définitif. Prêt pour les demi-finales ?</p>
            </div>
            <button 
              onClick={generateDemis}
              className="w-full md:w-auto bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-white hover:text-black transition-all active:scale-95"
            >
              <Trophy size={20} />
              Générer Demi-Finales
            </button>
          </div>
        )}
        {renderPouleSection('Gassin', 'orange')}
        {renderPouleSection('Ramatuelle', 'purple')}
      </div>
    </div>
  );

}
