import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { calculatePstElo, calculateModernElo, EloSettings } from '@/lib/elo-engine';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
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

    // 2. Resets des tables (Utilisation de critères compatibles UUID/Int)
    await supabase.from('elo_history').delete().not('player_id', 'is', null);
    await supabase.from('history_all').delete().gt('year', 0);

    // 3. Récupération des données sources
    const { data: players } = await supabase.from('profiles').select('*');
    const { data: teams } = await supabase.from('teams').select('*');
    // On charge les matchs avec les relations pour éviter les requêtes dans la boucle
    const { data: games } = await supabase.from('games')
      .select('*')
      .order('year', { ascending: true })
      .order('id', { ascending: true });

    if (!players || !teams || !games) throw new Error("Données sources introuvables");

    // Mapping pour accès rapide
    const teamsMap: Record<number, any> = {};
    teams.forEach(t => { teamsMap[t.id] = t; });

    let currentElo: Record<number, { pst: number, modern: number }> = {};
    players.forEach(p => {
      currentElo[p.id] = { pst: eloSettings.elo_init, modern: eloSettings.elo_init };
    });

    const historyEntries: any[] = [];
    const historyAll: any[] = [];

    // 4. Boucle de calcul
    for (const g of games) {
      const team1 = teamsMap[g.team_1_id];
      const team2 = teamsMap[g.team_2_id];
      if (!team1 || !team2) continue;

      const sc1 = g.score_1;
      const sc2 = g.score_2;
      const winSign = Math.sign(sc1 - sc2);
      const winArr = [winSign, winSign, -winSign, -winSign];

      // Calcul des deltas
      const avgPst1 = (currentElo[team1.tireur_id].pst + currentElo[team1.pointeur_id].pst) / 2;
      const avgPst2 = (currentElo[team2.tireur_id].pst + currentElo[team2.pointeur_id].pst) / 2;
      const avgMod1 = (currentElo[team1.tireur_id].modern + currentElo[team1.pointeur_id].modern) / 2;
      const avgMod2 = (currentElo[team2.tireur_id].modern + currentElo[team2.pointeur_id].modern) / 2;

      const deltaPst = calculatePstElo(avgPst1, avgPst2, sc1, sc2, g.type, eloSettings);
      const deltaMod = calculateModernElo(avgMod1, avgMod2, sc1, sc2, eloSettings.k_factor);

      // Mise à jour des 4 joueurs
      const pids = [team1.tireur_id, team1.pointeur_id, team2.tireur_id, team2.pointeur_id];
      pids.forEach((pid, i) => {
        const factor = i < 2 ? 1 : -1;
        currentElo[pid].pst += (deltaPst * factor);
        currentElo[pid].modern += (deltaMod * factor);
      });

      // Calcul du Leaderboard pour les Rangs
      const sorted = Object.entries(currentElo)
        .map(([id, val]) => ({ id: parseInt(id), pst: val.pst, modern: val.modern }))
        .sort((a, b) => b.pst - a.pst);
      
      const sortedMod = [...sorted].sort((a, b) => b.modern - a.modern);

      const ranksPst: Record<number, number> = {};
      sorted.forEach((item, index) => { ranksPst[item.id] = index + 1; });
      
      const ranksMod: Record<number, number> = {};
      sortedMod.forEach((item, index) => { ranksMod[item.id] = index + 1; });

      // Remplissage ELO_HISTORY (Les 4 joueurs du match)
      pids.forEach((pid, i) => {
        const advIdx = i < 2 ? 2 : 0; // Index du tireur adverse
        historyEntries.push({
          player_id: pid,
          game_id: g.id,
          year: g.year,
          elo_value: currentElo[pid].pst,
          elo_modern_value: currentElo[pid].modern,
          rank_at_time: ranksPst[pid],
          modern_rank_at_time: ranksMod[pid],
          win: winArr[i],
          type: g.type,
          sc_p: i < 2 ? sc1 : sc2,
          sc_c: i < 2 ? sc2 : sc1,
          poule: g.poule,
          tireur_id: pids[advIdx],
          pointeur_id: pids[advIdx + 1],
          tireur: players.find(p => p.id === pids[advIdx])?.nom || '?',
          pointeur: players.find(p => p.id === pids[advIdx + 1])?.nom || '?'
        });
      });

      // Remplissage HISTORY_ALL (Tous les joueurs pour le graphique)
      players.forEach(p => {
        historyAll.push({
          player_id: p.id,
          game_id: g.id,
          year: g.year,
          elo_value: currentElo[p.id].pst,
          elo_modern_value: currentElo[p.id].modern,
          rank: ranksPst[p.id],
          rank_modern: ranksMod[p.id],
          poule: g.poule,
          team1_id: g.team_1_id,
          team2_id: g.team_2_id
        });
      });
    }

    // 5. Sauvegarde par lots (Chunks)
    const chunkSize = 200;
    
    for (let i = 0; i < historyEntries.length; i += chunkSize) {
      await supabase.from('elo_history').insert(historyEntries.slice(i, i + chunkSize));
    }

    for (let i = 0; i < historyAll.length; i += chunkSize) {
      await supabase.from('history_all').insert(historyAll.slice(i, i + chunkSize));
    }

    return NextResponse.json({ success: true, message: "Recalcul global terminé" });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
