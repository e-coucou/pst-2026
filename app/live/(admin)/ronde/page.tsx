'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import RenderStepper from '@/components/Stepper';
import PredictionModal from '@/components/PredictionModal';
import { updateMatchScore, parseSettings } from '@/utils/elo-logic';
import { ArrowLeft, ArrowRight, Brain, Save, Trophy, Loader2, Edit2, Swords, Dices, RefreshCw } from 'lucide-react';
import { logActivity } from '@/utils/log-activity';
import { calculatePouleStandings, generateRondePairing, buildPlayedPairs } from '@/utils/live-stats';
import { simulateRandomScores } from '@/utils/simulate';
import PouleStandingsTable from '@/components/PouleStandingsTable';
import FavoriStar from '@/components/FavoriStar';
import { useFavoriId } from '@/hooks/useFavoriId';
import { useIsSuper } from '@/hooks/useIsSuper';

// 4 rondes suisses ; la 5ème "ronde" est en réalité une ronde de finales classées (cf.
// generateNextRound), gérée sur /live/finale comme pour le format 10 équipes.
const TOTAL_SWISS_ROUNDS = 4;

export default function LiveRondePage() {
  const supabase = createClient();
  const router = useRouter();
  const favoriId = useFavoriId();
  const isSuper = useIsSuper();
  const [simulating, setSimulating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});
  const [status, setStatus] = useState<string>('POULES');
  const [format, setFormat] = useState<string>('ronde');

  const [localScores, setLocalScores] = useState<Record<number, { s1: number | '', s2: number | '' }>>({});
  const [savingMatch, setSavingMatch] = useState<number | null>(null);
  const [eloSettings, setEloSettings] = useState<any>(null);
  const [matchToPredict, setMatchToPredict] = useState<{match: any, t1: any, t2: any} | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    const { data: tournoi } = await supabase.from('live_tournament').select('status, format').eq('id', 1).single();
    if (tournoi) {
      setStatus(tournoi.status);
      setFormat(tournoi.format || 'ronde');
    }

    const { data: sData } = await supabase.from('settings').select('*');
    if (sData) setEloSettings(parseSettings(sData || []));

    const { data: profilesData } = await supabase.from('profiles').select('id, nom');
    const pMap: Record<number, string> = {};
    if (profilesData) profilesData.forEach(p => pMap[p.id] = p.nom);
    setPlayersMap(pMap);

    const { data: teamsData } = await supabase.from('live_teams').select('*').eq('poule', 'Ronde');
    if (teamsData) setTeams(teamsData);

    const { data: matchesData } = await supabase
      .from('live_matches')
      .select('*')
      .eq('poule', 'Ronde')
      .order('round', { ascending: true })
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

  const currentRound = matches.length > 0 ? Math.max(...matches.map(m => m.round || 1)) : 1;
  const roundMatches = matches.filter(m => m.round === currentRound);
  const previousMatches = matches.filter(m => m.round < currentRound);
  const roundFinished = roundMatches.length === 5 && roundMatches.every(m => m.status === 'TERMINE');

  const standings = useMemo(
    () => calculatePouleStandings('Ronde', teams, matches, playersMap),
    [teams, matches, playersMap]
  );

  const handleScoreChange = (matchId: number, team: 1 | 2, value: string) => {
    const numValue = value === '' ? '' : parseInt(value, 10);
    setLocalScores(prev => ({
      ...prev,
      [matchId]: { ...prev[matchId], [team === 1 ? 's1' : 's2']: numValue }
    }));
  };

  const executeAction = async (url: string) => {
    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();
      if (!data.success) alert(`❌ Erreur : ${data.error}`);
    } catch (err) {
      alert("❌ Erreur réseau");
    }
  };

  const saveMatchResult = async (matchId: number) => {
    const scores = localScores[matchId];
    if (scores.s1 === '' || scores.s2 === '') return;
    setSavingMatch(matchId);
    try {
      const updatedMatch = await updateMatchScore(supabase, matchId, Number(scores.s1), Number(scores.s2), eloSettings);
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

  // Pas de Realtime sur cette page : un autre admin peut avoir saisi un score entre-temps.
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Outil de test (super admins) : remplit tous les matchs de la ronde courante non terminés
  // avec des scores aléatoires, via le même pipeline que la saisie manuelle (ELO inclus).
  // Réutilisable ronde après ronde pour observer l'évolution du classement cumulé.
  const handleSimulate = async () => {
    const pendingCount = roundMatches.filter(m => m.status !== 'TERMINE').length;
    if (pendingCount === 0) return;
    if (!confirm(`Simuler des scores aléatoires pour ${pendingCount} match(s) de la Ronde ${currentRound} ?`)) return;
    setSimulating(true);
    try {
      await simulateRandomScores(supabase, roundMatches, eloSettings, 'poule');
      await fetchData();
      executeAction('/api/admin/live-elo');
      logActivity(supabase, 'ADMIN_SIMULATE_SCORES', { context: 'ronde', round: currentRound, count: pendingCount });
    } catch (err: any) {
      alert("Erreur simulation : " + err.message);
    } finally {
      setSimulating(false);
    }
  };

  // Rondes 1 à 3 terminées -> génère la ronde suivante par appariement suisse. Ronde 4 (dernière
  // ronde suisse) terminée -> génère les finales classées : appariement par rang adjacent sur
  // le classement cumulé (1v2, 3v4, ...), en réutilisant les types 'Finale Rang1'..'Finale
  // Rang5' déjà utilisés par le format 10 équipes (bonus ELO "Finale" et libellés hérités
  // automatiquement, aucune nouvelle ligne `steps` nécessaire), puis redirige vers /live/finale
  // qui prend le relais (saisie des scores, palmarès, fin de tournoi).
  const generateNextRound = async () => {
    if (currentRound >= TOTAL_SWISS_ROUNDS) {
      if (!confirm("Générer les finales classées ? Cette action verrouille les rondes.")) return;
      setGenerating(true);
      try {
        const finalesMatchs = [];
        for (let i = 0; i < standings.length; i += 2) {
          finalesMatchs.push({
            poule: '',
            tableau: 'Principal',
            type: `Finale Rang${i / 2 + 1}`,
            team1_id: standings[i].id,
            team2_id: standings[i + 1].id,
            status: 'EN_COURS'
          });
        }

        const { error: insertError } = await supabase.from('live_matches').insert(finalesMatchs);
        if (insertError) throw insertError;

        await supabase.from('live_tournament').update({ status: 'FINALE' }).eq('id', 1);
        logActivity(supabase, 'ADMIN_GENERATE_FINALES_RONDE');
        router.push('/live/finale');
      } catch (err: any) {
        alert("Erreur lors de la génération : " + err.message);
      } finally {
        setGenerating(false);
      }
      return;
    }

    const nextRound = currentRound + 1;
    if (!confirm(`Générer la Ronde ${nextRound} ? L'appariement est calculé à partir du classement actuel.`)) return;
    setGenerating(true);
    try {
      const playedPairs = buildPlayedPairs(matches);
      const pairs = generateRondePairing(standings, playedPairs);
      const newMatches = pairs.map(([team1_id, team2_id]) => ({
        poule: 'Ronde',
        type: 'Poule',
        tableau: 'Principal',
        team1_id,
        team2_id,
        status: 'EN_COURS',
        round: nextRound
      }));

      const { error } = await supabase.from('live_matches').insert(newMatches);
      if (error) throw error;
      logActivity(supabase, 'ADMIN_GENERATE_RONDE', { round: nextRound });
      await fetchData();
    } catch (err: any) {
      alert("Erreur lors de la génération : " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-black animate-pulse italic">CHARGEMENT...</div>;

  const renderMatchRow = (m: any, editable: boolean) => {
    const isTermine = m.status === 'TERMINE';
    const s = localScores[m.id] || { s1: '', s2: '' };
    const t1 = teams.find(t => t.id === m.team1_id);
    const t2 = teams.find(t => t.id === m.team2_id);

    return (
      <div key={m.id} className={`p-3 md:p-4 rounded-xl md:rounded-2xl border ${isTermine ? 'bg-red-600/10 border-red-600/30' : 'bg-black border-white/10'} flex items-center justify-between gap-2 md:gap-4`}>
        <div className="flex-1 text-right min-w-0">
          <div className="text-[10px] text-zinc-500 font-black">#{m.team1_id}</div>
          <div className="text-[11px] md:text-[14px] font-bold uppercase truncate leading-tight">
            <span className="text-purple-500">{playersMap[t1?.pointeur_id] || t1?.pointeur_id} <FavoriStar active={t1?.pointeur_id === favoriId} /></span><br className="md:hidden" />
            <span className="hidden md:inline"> & </span>
            <span className="text-orange-500">{playersMap[t1?.tireur_id] || t1?.tireur_id} <FavoriStar active={t1?.tireur_id === favoriId} /></span>
          </div>
        </div>

        {editable ? (
          <div className="flex items-center gap-1 md:gap-2 bg-zinc-900 p-1 md:p-2 rounded-lg md:rounded-xl">
            <input
              type="number" inputMode="numeric" value={s.s1}
              onChange={(e) => handleScoreChange(m.id, 1, e.target.value)}
              disabled={isTermine}
              className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none"
            />
            <span className="text-zinc-400 font-bold">-</span>
            <input
              type="number" inputMode="numeric" value={s.s2}
              onChange={(e) => handleScoreChange(m.id, 2, e.target.value)}
              disabled={isTermine}
              className="w-8 h-8 md:w-10 md:h-10 bg-black text-center font-black rounded-md md:rounded-lg disabled:text-green-500 text-sm md:text-base focus:ring-1 focus:ring-red-600 outline-none"
            />
          </div>
        ) : (
          <div className="shrink-0 bg-zinc-900 px-4 py-2 rounded-xl font-black text-lg border border-white/5 text-white text-center">
            {m.score_team1} - {m.score_team2}
          </div>
        )}

        <div className="flex-1 text-left min-w-0">
          <div className="text-[10px] text-zinc-500 font-black">#{m.team2_id}</div>
          <div className="text-[11px] md:text-[14px] font-bold uppercase truncate leading-tight">
            <span className="text-purple-500">{playersMap[t2?.pointeur_id] || t2?.pointeur_id} <FavoriStar active={t2?.pointeur_id === favoriId} /></span><br className="md:hidden" />
            <span className="hidden md:inline"> & </span>
            <span className="text-orange-500">{playersMap[t2?.tireur_id] || t2?.tireur_id} <FavoriStar active={t2?.tireur_id === favoriId} /></span>
          </div>
        </div>

        {editable && (
          <>
            <div className="flex shrink-0 group">
              {!isTermine && (
                <button onClick={() => setMatchToPredict({ match: m, t1, t2 })} className="mb-0 flex flex-col items-center gap-1 transition-all">
                  <div className="p-1.5 bg-zinc-800 rounded-full transition-colors group-hover:bg-red-500 group-hover:scale-[1.3]">
                    <Brain size={20} className="text-zinc-500 group-hover:text-white md:h-6" />
                  </div>
                </button>
              )}
            </div>
            <div className="flex shrink-0">
              {isTermine ? (
                <button onClick={() => unlockMatch(m.id)} disabled={savingMatch === m.id} aria-label="Déverrouiller le match pour modification" className="text-red-500 p-1 hover:text-white transition-colors disabled:opacity-40">
                  {savingMatch === m.id ? <Loader2 size={20} className="animate-spin" /> : <Edit2 size={20} className="md:w-6 md:h-6" />}
                </button>
              ) : (
                <button onClick={() => saveMatchResult(m.id)} disabled={savingMatch === m.id} className="p-2 rounded-lg text-white transition-all bg-red-600 active:bg-red-800">
                  {savingMatch === m.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 md:mb-12 flex justify-between items-center border-b border-white/10 pb-6 md:pb-8 group">
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter group-hover:text-red-600">
            Live <span className="text-red-600 group-hover:text-white">Rondes</span>
          </h1>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Réactualiser"
              className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5 disabled:opacity-40"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> <span className="hidden md:inline">Actualiser</span>
            </button>
            {isSuper && (
              <button
                onClick={handleSimulate}
                disabled={simulating}
                title="Simuler des scores aléatoires (test)"
                className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-500 hover:text-amber-300 bg-amber-500/10 px-4 py-2 rounded-full border border-dashed border-amber-500/40 disabled:opacity-40"
              >
                {simulating ? <Loader2 size={14} className="animate-spin" /> : <Dices size={14} />} <span className="hidden md:inline">Simuler</span>
              </button>
            )}
            <button onClick={() => router.push('/live/admin')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
              <ArrowLeft size={14} /> <span className="hidden md:inline">équipes</span>
            </button>
            <button onClick={() => router.push('/live/finale')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
              <ArrowRight size={14} /> <span className="hidden md:inline">finales</span>
            </button>
          </div>
        </header>

        <RenderStepper currentStatus={status} format={format} />

        {roundFinished && (
          <div className="mb-12 p-8 rounded-[2.5rem] bg-red-600 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-bounce-subtle">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-black uppercase italic text-white leading-none mb-2">
                {currentRound >= TOTAL_SWISS_ROUNDS ? 'Rondes Suisses Terminées !' : `Ronde ${currentRound} Terminée !`}
              </h3>
              <p className="text-red-100 font-bold text-sm">
                {currentRound >= TOTAL_SWISS_ROUNDS
                  ? "Le classement est définitif. Prêt pour les finales classées ?"
                  : `Prêt pour la Ronde ${currentRound + 1} ? L'appariement suivra le classement actuel.`}
              </p>
            </div>
            <button
              onClick={generateNextRound}
              disabled={generating}
              className="w-full md:w-auto bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50"
            >
              {generating ? <Loader2 size={20} className="animate-spin" /> : <Trophy size={20} />}
              {currentRound >= TOTAL_SWISS_ROUNDS ? 'Générer les Finales' : `Générer la Ronde ${currentRound + 1}`}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 md:gap-12 mb-8 md:mb-12">
          <div className="p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-white/5">
            <h2 className="text-xl md:text-2xl font-black uppercase italic text-red-600 flex items-center gap-3 mb-6 md:mb-8">
              <Swords size={20} className="md:w-6 md:h-6" /> Ronde {currentRound} / {TOTAL_SWISS_ROUNDS}
            </h2>
            <div className="space-y-3 md:space-y-4">
              {roundMatches.map(m => renderMatchRow(m, true))}
            </div>
          </div>

          <PouleStandingsTable pouleName="Ronde" standings={standings} accentColor="orange" />
        </div>

        {previousMatches.length > 0 && (
          <div className="mb-12">
            <h3 className="text-sm font-black uppercase italic text-zinc-500 mb-6 flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-zinc-800"></div> Rondes précédentes <div className="h-[1px] flex-1 bg-zinc-800"></div>
            </h3>
            <div className="space-y-6">
              {Array.from({ length: currentRound - 1 }, (_, i) => i + 1).map(r => (
                <div key={r} className="bg-zinc-900/30 border border-white/5 rounded-2xl p-4">
                  <div className="text-[10px] font-black uppercase italic text-zinc-500 mb-3">Ronde {r}</div>
                  <div className="space-y-2">
                    {previousMatches.filter(m => m.round === r).map(m => renderMatchRow(m, false))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
