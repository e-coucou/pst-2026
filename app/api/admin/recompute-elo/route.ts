import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { calculatePstElo, calculateModernElo } from '@/lib/elo-engine';

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Nécessaire pour DELETE/INSERT massif
  );

  try {
    // 1. Récupérer les Settings
    const { data: settingsData } = await supabase.from('settings').select('*');
    const s: any = {};
    settingsData?.forEach(item => s[item.key] = item.value);

    // 2. Reset de la table historique
    await supabase.from('elo_history').delete().neq('id', 0);

    // 3. Initialisation des scores en mémoire
    const { data: players } = await supabase.from('profiles').select('id');
    let currentElo: Record<number, {pst: number, modern: number}> = {};
    players?.forEach(p => {
      currentElo[p.id] = { pst: s.elo_init, modern: s.elo_init };
    });

    // 4. Boucle sur les matchs (triés par date)
    const { data: games } = await supabase.from('games')
      .select('*, team1:teams!team_1_id(*), team2:teams!team_2_id(*)')
      .order('year', { ascending: true })
      .order('id', { ascending: true });

    const historyEntries = [];

    for (const g of games!) {
      const avgPst1 = (currentElo[g.team1.tireur_id].pst + currentElo[g.team1.pointeur_id].pst) / 2;
      const avgPst2 = (currentElo[g.team2.tireur_id].pst + currentElo[g.team2.pointeur_id].pst) / 2;
      
      const avgMod1 = (currentElo[g.team1.tireur_id].modern + currentElo[g.team1.pointeur_id].modern) / 2;
      const avgMod2 = (currentElo[g.team2.tireur_id].modern + currentElo[g.team2.pointeur_id].modern) / 2;

      const deltaPst = calculatePstElo(avgPst1, avgPst2, g.score_1, g.score_2, g.type, s);
      const deltaMod = calculateModernElo(avgMod1, avgMod2, g.score_1, g.score_2, s.k_factor);

      // Mise à jour des joueurs
      [g.team1.tireur_id, g.team1.pointeur_id, g.team2.tireur_id, g.team2.pointeur_id].forEach((pid, idx) => {
        const isTeam1 = idx < 2;
        const factor = isTeam1 ? 1 : -1;
        
        currentElo[pid].pst += (deltaPst * factor);
        currentElo[pid].modern += (deltaMod * factor);

        historyEntries.push({
          player_id: pid,
          game_id: g.id,
          year: g.year,
          elo_value: currentElo[pid].pst,
          elo_modern_value: currentElo[pid].modern
        });
      });
    }

    // 5. Insertion bulk
    await supabase.from('elo_history').insert(historyEntries);

    return NextResponse.json({ success: true, count: historyEntries.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
