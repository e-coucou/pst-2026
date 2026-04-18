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
  // On vide la table historique avant de recommencer
  const { error: deleteError } = await supabase.from('elo_history').delete().neq('id', 0);
  if (deleteError) {
    console.error("❌ Erreur lors du reset:", deleteError);
    return;
  }

  // 1. Récupérer les Settings
  console.log("⚙️ Chargement des paramètres...");
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
    poids_finaliste: s.finaliste || 1.2, // On utilise ta clé 'finaliste' du JSON
    k_factor: s.k_factor || 20
  };

  // 2. Récupérer les Joueurs et les Équipes (séparément pour éviter les jointures complexes)
  console.log("👥 Chargement des joueurs et des équipes...");
  const { data: players } = await supabase.from('profiles').select('id');
  const { data: teams } = await supabase.from('teams').select('*');
  
  if (!players || !teams) {
    console.error("❌ Impossible de charger les joueurs ou les équipes.");
    return;
  }

  // Création d'un dictionnaire pour retrouver une équipe par son ID instantanément
  const teamsMap: Record<number, any> = {};
  teams.forEach(t => { teamsMap[t.id] = t; });

  // Initialisation des scores actuels en mémoire
  let currentElo: Record<number, { pst: number, modern: number }> = {};
  players.forEach(p => {
    currentElo[p.id] = { pst: eloSettings.elo_init, modern: eloSettings.elo_init };
  });

  // 3. Récupérer les Matchs dans l'ordre chronologique
  console.log("🏟️ Récupération des matchs...");
  const { data: games, error: gamesError } = await supabase.from('games')
    .select('*')
    .order('year', { ascending: true })
    .order('id', { ascending: true });

  if (gamesError || !games) {
    console.error("❌ Erreur lors de la lecture des matchs:", gamesError);
    return;
  }

  console.log(`🧐 Analyse de ${games.length} matchs...`);

  const historyEntries: any[] = [];

  for (const g of games) {
    const team1 = teamsMap[g.team_1_id];
    const team2 = teamsMap[g.team_2_id];

    if (!team1 || !team2) {
      console.warn(`⚠️ Match ${g.id} ignoré: Équipe ${g.team_1_id} ou ${g.team_2_id} introuvable.`);
      continue;
    }

    // Calcul des moyennes ELO des équipes au moment du match
    const avgPst1 = (currentElo[team1.tireur_id].pst + currentElo[team1.pointeur_id].pst) / 2;
    const avgPst2 = (currentElo[team2.tireur_id].pst + currentElo[team2.pointeur_id].pst) / 2;
    
    const avgMod1 = (currentElo[team1.tireur_id].modern + currentElo[team1.pointeur_id].modern) / 2;
    const avgMod2 = (currentElo[team2.tireur_id].modern + currentElo[team2.pointeur_id].modern) / 2;

    // Calcul des deltas (Gains / Pertes)
    const deltaPst = calculatePstElo(avgPst1, avgPst2, g.score_1, g.score_2, g.type, eloSettings);
    const deltaMod = calculateModernElo(avgMod1, avgMod2, g.score_1, g.score_2, eloSettings.k_factor);

    // Mise à jour des 4 joueurs et création des entrées d'historique
    const updatePlayer = (pid: number, dPst: number, dMod: number) => {
      currentElo[pid].pst += dPst;
      currentElo[pid].modern += dMod;
      historyEntries.push({
        player_id: pid,
        game_id: g.id,
        year: g.year,
        elo_value: currentElo[pid].pst,
        elo_modern_value: currentElo[pid].modern
      });
    };

    // Équipe 1 (Tireur + Pointeur)
    updatePlayer(team1.tireur_id, deltaPst, deltaMod);
    updatePlayer(team1.pointeur_id, deltaPst, deltaMod);

    // Équipe 2 (Tireur + Pointeur) -> On inverse le delta
    updatePlayer(team2.tireur_id, -deltaPst, -deltaMod);
    updatePlayer(team2.pointeur_id, -deltaPst, -deltaMod);
  }

  // 4. Sauvegarde massive dans Supabase
  console.log(`💾 Sauvegarde de ${historyEntries.length} points d'historique...`);
  
  // On découpe par paquets de 200 pour éviter de saturer l'API
  const chunkSize = 200;
  for (let i = 0; i < historyEntries.length; i += chunkSize) {
    const chunk = historyEntries.slice(i, i + chunkSize);
    const { error: insertError } = await supabase.from('elo_history').insert(chunk);
    if (insertError) {
      console.error(`❌ Erreur d'insertion au paquet ${i}:`, insertError);
      break;
    }
  }

  console.log("✨ Terminé ! L'historique ELO est à jour pour les deux méthodes.");
}

recompute().catch(console.error);
