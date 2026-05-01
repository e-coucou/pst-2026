import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { calculatePstElo, calculateModernElo, EloSettings } from '../lib/elo-engine';

// Chargement des variables d'environnement
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function recomputeLiveHistory() {

  const { error: err1 } = await supabase.from('live_history').delete().gt('year', 0);
  if (err1) {
    console.error("❌ Erreur lors du reset:", err1);
    return;
  }

  console.log('Reset SuccesFul')

  // 1. Récupérer les Settings
  const { data: settingsData } = await supabase.from('settings').select('*');
  const s: any = {};
  settingsData?.forEach(item => s[item.key] = item.value);

  const eloSettings: EloSettings = {
    elo_init: s.elo_init || 100,
    bonus_point: s.bonus_point || 1.1,
    bonus_seuil: s.bonus_seuil || 6,
    seuil: s.seuil || 10,
    max_ecart: s.max_ecart || 5,
    poids_finale: s.poids_finale || 1.25,
    poids_finaliste: s.finaliste || 1.2,
    k_factor: s.k_factor || 20
  };

  // 2. Récupérer les données
  const { data: players } = await supabase.from('profiles').select('*');
  const { data: liveTeams } = await supabase.from('live_teams').select('*');
  const { data: liveMatches } = await supabase
    .from('live_matches')
    .select('*')
    .eq('status', 'TERMINE')
    .order('id', { ascending: true });

  if (!players || !liveTeams || !liveMatches) return;

  // 3. Initialisation ELO par JOUEUR (profiles.id)
  let currentElo: Record<number, { pst: number, modern: number }> = {};
  players.forEach(p => {
    currentElo[p.id] = { pst: eloSettings.elo_init, modern: eloSettings.elo_init };
  });

  // Mise à jour avec les elo_start des joueurs participants au Live
  liveTeams.forEach(t => {
    if (t.tireur_id && currentElo[t.tireur_id]) {
        currentElo[t.tireur_id].pst = t.elo_start_tireur || t.elo_start;
        currentElo[t.tireur_id].modern = t.modern_start;
    }
    if (t.pointeur_id && currentElo[t.pointeur_id]) {
        currentElo[t.pointeur_id].pst = t.elo_start_pointeur || t.elo_start;
        currentElo[t.pointeur_id].modern = t.modern_start;
    }
  });

  const teamsMap: Record<string, any> = {};
  liveTeams.forEach(t => { teamsMap[t.id] = t; });

  const historyAllEntries: any[] = [];

  for (const m of liveMatches) {
    const t1 = teamsMap[m.team1_id];
    const t2 = teamsMap[m.team2_id];
    if (!t1 || !t2) continue;

    // Calcul des moyennes des équipes au moment du match
    const avgPst1 = (currentElo[t1.tireur_id].pst + currentElo[t1.pointeur_id].pst) / 2;
    const avgPst2 = (currentElo[t2.tireur_id].pst + currentElo[t2.pointeur_id].pst) / 2;
    const avgMod1 = (currentElo[t1.tireur_id].modern + currentElo[t1.pointeur_id].modern) / 2;
    const avgMod2 = (currentElo[t2.tireur_id].modern + currentElo[t2.pointeur_id].modern) / 2;

    const deltaPst = calculatePstElo(avgPst1, avgPst2, m.score_team1, m.score_team2, m.type, eloSettings);
    const deltaMod = calculateModernElo(avgMod1, avgMod2, m.score_team1, m.score_team2, eloSettings.k_factor);

    // Mise à jour des 4 joueurs du match
    const participants = [t1.tireur_id, t1.pointeur_id, t2.tireur_id, t2.pointeur_id];
    participants.forEach((pid, idx) => {
      const sign = idx < 2 ? 1 : -1;
      currentElo[pid].pst += (deltaPst * sign);
      currentElo[pid].modern += (deltaMod * sign);
    });

    // Calcul des Rangs (Snapshot)
    const sortedElo = Object.entries(currentElo).sort((a, b) => b[1].pst - a[1].pst);
    const sortedModern = Object.entries(currentElo).sort((a, b) => b[1].modern - a[1].modern);
    
    const ranksElo: Record<string, number> = {};
    sortedElo.forEach(([id], idx) => { ranksElo[id] = idx + 1; });
    const ranksModern: Record<string, number> = {};
    sortedModern.forEach(([id], idx) => { ranksModern[id] = idx + 1; });

    // Snapshot pour TOUS les joueurs après ce match
    players.forEach(p => {
      historyAllEntries.push({
        player_id: p.id,
        game_id: m.id, // Vérifie si ta table utilise game_id ou match_id
        year: 2026,
        elo_value: currentElo[p.id].pst,
        elo_modern_value: currentElo[p.id].modern,
        rank: ranksElo[p.id],
        rank_modern: ranksModern[p.id],
        poule: m.poule || '',
        team1_id: m.team1_id, // "A", "B", etc. (Doit être type TEXT en base)
        team2_id: m.team2_id,
        created_at: m.updated_at
      });
    });
  }

  // Insertion par lots
  const chunkSize = 500;
  for (let i = 0; i < historyAllEntries.length; i += chunkSize) {
    const { error } = await supabase.from('live_history').insert(historyAllEntries.slice(i, i + chunkSize));
    if (error) console.error("❌ Erreur insertion:", error);
  }
  console.log("✨ Terminé !");
}
recomputeLiveHistory();
