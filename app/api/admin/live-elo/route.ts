import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { calculatePstElo, calculateModernElo, calculateSkillRating, makeSkillRating, skillOrdinal, EloSettings, Rating } from '@/lib/elo-engine';

export async function POST() {
  try {
    // Route réservée à admin/super (mêmes rôles que le groupe live/(admin), qui l'appelle à
    // chaque saisie de score). Sans cette vérification, n'importe qui connaissant l'URL (même
    // non authentifié) pouvait déclencher un recalcul de l'historique ELO du tournoi live.
    const authClient = await createServerClient();
    const { data: role } = await authClient.rpc('get_my_role');
    if (!role || !['admin', 'super'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Action réservée aux rôles admin/super' }, { status: 403 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Nécessaire pour bypasser le RLS et DELETE
    );

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

    // 2. Récupérer les données sources
    const { data: players } = await supabase.from('profiles').select('*');
    const { data: liveTeams } = await supabase.from('live_teams').select('*');
    const { data: liveMatches } = await supabase
      .from('live_matches')
      .select('*')
      .eq('status', 'TERMINE')
      .order('id', { ascending: true });

    if (!players || !liveTeams || !liveMatches) {
      throw new Error("Données manquantes pour le calcul");
    }

    // 3. Initialisation ELO par JOUEUR
    let currentElo: Record<number, { pst: number, modern: number, skill: Rating }> = {};
    players.forEach(p => {
      currentElo[p.id] = { pst: eloSettings.elo_init, modern: eloSettings.elo_init, skill: makeSkillRating() };
    });

    liveTeams.forEach(t => {
      if (t.tireur_id && currentElo[t.tireur_id]) {
        currentElo[t.tireur_id].pst = t.elo_start_tireur || t.elo_start;
        currentElo[t.tireur_id].modern = t.modern_start;
        // skill_mu/sigma_tireur : nullable tant que la constitution d'équipes ne les alimente
        // pas encore (étape suivante du plan) — repli sur un rating par défaut dans ce cas.
        if (t.skill_mu_tireur != null && t.skill_sigma_tireur != null) {
          currentElo[t.tireur_id].skill = makeSkillRating(t.skill_mu_tireur, t.skill_sigma_tireur);
        }
      }
      if (t.pointeur_id && currentElo[t.pointeur_id]) {
        currentElo[t.pointeur_id].pst = t.elo_start_pointeur || t.elo_start;
        currentElo[t.pointeur_id].modern = t.modern_start;
        if (t.skill_mu_pointeur != null && t.skill_sigma_pointeur != null) {
          currentElo[t.pointeur_id].skill = makeSkillRating(t.skill_mu_pointeur, t.skill_sigma_pointeur);
        }
      }
    });

    const teamsMap: Record<string, any> = {};
    liveTeams.forEach(t => { teamsMap[t.id] = t; });

    const historyAllEntries: any[] = [];

    // 4. Boucle de calcul
    for (const m of liveMatches) {
      const t1 = teamsMap[m.team1_id];
      const t2 = teamsMap[m.team2_id];
      if (!t1 || !t2) continue;

      const avgPst1 = (currentElo[t1.tireur_id].pst + currentElo[t1.pointeur_id].pst) / 2;
      const avgPst2 = (currentElo[t2.tireur_id].pst + currentElo[t2.pointeur_id].pst) / 2;
      const avgMod1 = (currentElo[t1.tireur_id].modern + currentElo[t1.pointeur_id].modern) / 2;
      const avgMod2 = (currentElo[t2.tireur_id].modern + currentElo[t2.pointeur_id].modern) / 2;

      const deltaPst = calculatePstElo(avgPst1, avgPst2, m.score_team1, m.score_team2, m.type, eloSettings);
      const deltaMod = calculateModernElo(avgMod1, avgMod2, m.score_team1, m.score_team2, eloSettings.k_factor);

      const { team1: skillTeam1, team2: skillTeam2 } = calculateSkillRating(
        [currentElo[t1.tireur_id].skill, currentElo[t1.pointeur_id].skill],
        [currentElo[t2.tireur_id].skill, currentElo[t2.pointeur_id].skill],
        m.score_team1, m.score_team2
      );
      currentElo[t1.tireur_id].skill = skillTeam1[0];
      currentElo[t1.pointeur_id].skill = skillTeam1[1];
      currentElo[t2.tireur_id].skill = skillTeam2[0];
      currentElo[t2.pointeur_id].skill = skillTeam2[1];

      const participants = [t1.tireur_id, t1.pointeur_id, t2.tireur_id, t2.pointeur_id];
      participants.forEach((pid, idx) => {
        const sign = idx < 2 ? 1 : -1;
        currentElo[pid].pst += (deltaPst * sign);
        currentElo[pid].modern += (deltaMod * sign);
      });

      const sortedElo = Object.entries(currentElo).sort((a, b) => b[1].pst - a[1].pst);
      const sortedModern = Object.entries(currentElo).sort((a, b) => b[1].modern - a[1].modern);
      const sortedSkill = Object.entries(currentElo).sort((a, b) => skillOrdinal(b[1].skill) - skillOrdinal(a[1].skill));

      const ranksElo: Record<string, number> = {};
      sortedElo.forEach(([id], idx) => { ranksElo[id] = idx + 1; });
      const ranksModern: Record<string, number> = {};
      sortedModern.forEach(([id], idx) => { ranksModern[id] = idx + 1; });
      const ranksSkill: Record<string, number> = {};
      sortedSkill.forEach(([id], idx) => { ranksSkill[id] = idx + 1; });

      players.forEach(p => {
        historyAllEntries.push({
          player_id: p.id,
          game_id: m.id,
          year: 2026,
          elo_value: currentElo[p.id].pst,
          elo_modern_value: currentElo[p.id].modern,
          skill_ordinal: skillOrdinal(currentElo[p.id].skill),
          skill_mu: currentElo[p.id].skill.mu,
          skill_sigma: currentElo[p.id].skill.sigma,
          rank: ranksElo[p.id],
          rank_modern: ranksModern[p.id],
          rank_skill: ranksSkill[p.id],
          poule: m.poule || '',
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          created_at: m.updated_at
        });
      });
    }

    // 5. Nettoyage des matchs qui ne sont plus TERMINE (ex: reset manuel via /live/reset) + upsert
    // par lots. Un simple DELETE-de-tout puis INSERT-de-tout n'est pas atomique (deux allers-retours
    // réseau distincts) : avec 4 terrains joués en parallèle, deux scores saisis à quelques secondes
    // d'intervalle déclenchent deux appels à cette route qui peuvent s'entrelacer (delete A, delete B,
    // insert B, insert A) et laisser les lignes de A en doublon à côté de celles de B — c'est ce qui
    // faisait apparaître un joueur deux fois sur le graphique dès qu'il avait joué un 2e match.
    // L'upsert sur (player_id, game_id) rend le recalcul idempotent : deux appels concurrents finissent
    // par écrire le même résultat sans jamais dupliquer une ligne.
    const validGameIds = liveMatches.map(m => m.id);
    if (validGameIds.length > 0) {
      await supabase.from('live_history').delete().not('game_id', 'in', `(${validGameIds.join(',')})`);
    } else {
      await supabase.from('live_history').delete().gt('year', 0);
    }

    const chunkSize = 500;
    for (let i = 0; i < historyAllEntries.length; i += chunkSize) {
      const chunk = historyAllEntries.slice(i, i + chunkSize);
      const { error: insertError } = await supabase
        .from('live_history')
        .upsert(chunk, { onConflict: 'player_id,game_id' });
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, message: "Historique recalculé avec succès" });

  } catch (error: any) {
    console.error("Erreur API Recompute:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
