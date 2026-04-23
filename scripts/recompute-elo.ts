import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { calculatePstElo, calculateModernElo, EloSettings } from '../lib/elo-engine';

// Chargement des variables d'environnement
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function recompute() {
  console.log("🔄 Reset de l'historique...");
  const { error: deleteError } = await supabase.from('elo_history').delete().neq('id', 0);
  if (deleteError) {
    console.error("❌ Erreur lors du reset:", deleteError);
    return;
  }
  console.log("🔄 Reset de history_all...");
  const { error: deleteError } = await supabase.from('history_all').delete().neq('id', 0);
  if (deleteError) {
    console.error("❌ Erreur lors du reset:", deleteError);
    return;
  }

  // 1. Récupérer les Settings
  console.log("⚙️  Chargement des paramètres...");
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

  // 2. Récupérer les Joueurs et les Équipes
  const { data: players } = await supabase.from('profiles').select('id');
  const { data: teams } = await supabase.from('teams').select('*');
  
  if (!players || !teams) {
    console.error("❌ Impossible de charger les joueurs ou les équipes.");
    return;
  }

  const teamsMap: Record<number, any> = {};
  teams.forEach(t => { teamsMap[t.id] = t; });

  let currentElo: Record<number, { pst: number, modern: number }> = {};
  players.forEach(p => {
    currentElo[p.id] = { pst: eloSettings.elo_init, modern: eloSettings.elo_init };
  });

  // 3. Récupérer les Matchs
  const { data: games, error: gamesError } = await supabase.from('games')
    .select('*')
    .order('year', { ascending: true })
    .order('id', { ascending: true });

  if (gamesError || !games) {
    console.error("❌ Erreur matchs:", gamesError);
    return;
  }

  console.log(`🧐 Analyse de ${games.length} matchs...`);
  const historyEntries: any[] = [];
  const historyAll: any[] = [];

  for (const g of games) {
    const team1 = teamsMap[g.team_1_id];
    const team2 = teamsMap[g.team_2_id];
    const sc1 = g.score_1;
    const sc2 = g.score_2;
    if (!team1 || !team2) continue;
    const  _win = Math.sign(sc1-sc2)
    const win = [_win, _win, -_win, -_win ]
    const scores = [[sc1,sc2],[sc1,sc2],[sc2,sc1],[sc2,sc1]]

    const avgPst1 = (currentElo[team1.tireur_id].pst + currentElo[team1.pointeur_id].pst) / 2;
    const avgPst2 = (currentElo[team2.tireur_id].pst + currentElo[team2.pointeur_id].pst) / 2;
    const avgMod1 = (currentElo[team1.tireur_id].modern + currentElo[team1.pointeur_id].modern) / 2;
    const avgMod2 = (currentElo[team2.tireur_id].modern + currentElo[team2.pointeur_id].modern) / 2;

    const deltaPst = calculatePstElo(avgPst1, avgPst2, g.score_1, g.score_2, g.type, eloSettings);
    const deltaMod = calculateModernElo(avgMod1, avgMod2, g.score_1, g.score_2, eloSettings.k_factor);

    // 1. Mise à jour des scores PST et Modern en mémoire
    currentElo[team1.tireur_id].pst += deltaPst;
    currentElo[team1.tireur_id].modern += deltaMod;
    currentElo[team1.pointeur_id].pst += deltaPst;
    currentElo[team1.pointeur_id].modern += deltaMod;

    currentElo[team2.tireur_id].pst -= deltaPst;
    currentElo[team2.tireur_id].modern -= deltaMod;
    currentElo[team2.pointeur_id].pst -= deltaPst;
    currentElo[team2.pointeur_id].modern -= deltaMod;

    // 2. CALCUL DU RANG (on regarde qui est devant qui à cet instant précis)
    const leaderboard = Object.entries(currentElo)
      .map(([id, scores]) => ({ id: parseInt(id), pst: scores.pst }))
      .sort((a, b) => b.pst - a.pst);
    const leaderboard_modern = Object.entries(currentElo)
      .map(([id, scores]) => ({ id: parseInt(id), modern: scores.modern }))
      .sort((a, b) => b.modern - a.modern);


    // 3. Création des entrées d'historique pour les 4 joueurs du match
    const pids = [team1.tireur_id, team1.pointeur_id, team2.tireur_id, team2.pointeur_id];
    
    pids.forEach( (pid,i) => {
      const rank = leaderboard.findIndex(p => p.id === pid) + 1;
      const rank_modern = leaderboard_modern.findIndex(p => p.id === pid) + 1;
      historyEntries.push({
        player_id: pid,
        game_id: g.id,
        year: g.year,
        elo_value: currentElo[pid].pst,
        elo_modern_value: currentElo[pid].modern,
        rank_at_time: rank,
        modern_rank_at_time: rank_modern,
        type: g.type,
        win: win[i],
        sc_p: (i<2?sc1:sc2),
        sc_c: (i<2?sc2:sc1),
      });
    });

	// 2. Création rapide du Leaderboard (Tri)
	const sortedElo = Object.entries(currentElo)
    	.map(([id, scores]) => ({ id: parseInt(id), pst: scores.pst }))
    	.sort((a, b) => b.pst - a.pst);
	const sortedModern = Object.entries(currentElo)
    	.map(([id, scores]) => ({ id: parseInt(id), pst: scores.modern }))
    	.sort((a, b) => b.pst - a.pst);
	// 3. Mapping des rangs (Dictionnaire pour performance O(1))
	const ranksElo = {};
	sortedElo.forEach((item, index) => { ranksElo[item.id] = index + 1; });
	const ranksModern = {};
	sortedModern.forEach((item, index) => { ranksModern[item.id] = index + 1; });
    	
    players.forEach( (p,i) => {
    	historyAll.push({
    		player_id: p.id,
    		game_id: g.id,
    		year: g.year,
    		elo_value: currentElo[p.id].pst,
    		elo_modern_value: currentElo[p.id].modern,
    		rank: ranksElo[p.id],
    		rank_modern: ranksModern[p.id]
    	})	
    });
  }

  // 4. Sauvegarde
  console.log(`💾 Sauvegarde de ${historyEntries.length} points...`);
  const chunkSize = 200;
  for (let i = 0; i < historyEntries.length; i += chunkSize) {
    const chunk = historyEntries.slice(i, i + chunkSize);
    const { error } = await supabase.from('elo_history').insert(chunk);
    if (error) {
      console.error("❌ Erreur insertion:", error);
      break;
    }
  }
  
  console.log(`💾 Sauvegarde de ${historyAll.length} points...`);
  for (let i = 0; i < historyAll.length; i += chunkSize) {
    const chunk = historyAll.slice(i, i + chunkSize);
    const { error } = await supabase.from('history_all').insert(chunk);
    if (error) {
      console.error("❌ Erreur insertion:", error);
      break;
    }
  }
 
  console.log("✨ Terminé !");
}

recompute().catch(console.error);
