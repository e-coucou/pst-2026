import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

async function migrate() {
  console.log("🚀 Lecture du fichier JSON...");
  const data = JSON.parse(fs.readFileSync('./rky-001-export.json', 'utf8'));

  // 1. SAISONS
  // On récupère toutes les années uniques présentes dans les équipes
  const years = Array.from(new Set(data.equipes.map((e: any) => e.annee))) as number[];
  // On s'assure que l'année en cours (2026) est présente
  if (!years.includes(data.param.annee)) years.push(data.param.annee);

  await supabase.from('seasons').upsert(
    years.map(y => ({ year: y, is_active: y === data.param.annee }))
  );
  console.log("✅ Saisons synchronisées");

  // 2. PROFILES (Joueurs)
  const profiles = data.joueurs.map((j: any) => ({
    id: j.id,
    nom: j.nom === "_______" ? `Joueur ${j.id}` : j.nom
  }));
  await supabase.from('profiles').upsert(profiles);
  console.log("✅ Profils joueurs importés");

  // 3. SETTINGS (Paramètres complets pour le moteur ELO)
  const p = data.param;
  
  const settings = [
    { key: 'elo_init', value: p.init || 1000, label: 'ELO Initial' },
    { key: 'bonus_point', value: p.bonus || 1.1, label: 'Bonus Victoire' },
    { key: 'bonus_seuil', value: p.bonusSeuil || 0.05, label: 'Bonus au delà du seuil' },
    { key: 'seuil', value: p.seuil || 10, label: 'Seuil d\'écart de points' },
    { key: 'max_ecart', value: p.maxEcart || 12, label: 'Écart maximum pris en compte' },
    { key: 'poids_finale', value: p.finale || 1.5, label: 'Coefficient Finale' },
    { key: 'poids_finaliste', value: p.finaliste || 1.2, label: 'Coefficient Demi-finale' },
    { key: 'std_deviation', value: p.std || 1, label: 'Écart Type (std)' },
    { key: 'k_factor', value: 20, label: 'Facteur K (Sensibilité)' } // Valeur par défaut
  ];

  await supabase.from('settings').upsert(settings);
  console.log("✅ Tous les paramètres de calcul (PST) ont été importés");

  // 4. TEAMS (Équipes)
  const teamsToInsert = data.equipes.map((e: any, index: number) => ({
    id: e.id !== undefined ? e.id : index, // Utilise l'ID si présent, sinon l'index
    nom: e.nom,
    year: e.annee,
    tireur_id: e.J1,
    pointeur_id: e.J2
  }));
  await supabase.from('teams').upsert(teamsToInsert);
  console.log(`✅ ${teamsToInsert.length} Équipes importées`);

  // 5. GAMES (Matchs)
  const matchs = data.matchs.map((m: any) => ({
    id: m.id,
    year: m.annee,
    poule: m.poule,
    type: m.type,
    tableau: m.tableau || 'Principal',
    team_1_id: m.E1,
    team_2_id: m.E2,
    score_1: m.Sc1, // Note le Sc1 au lieu de S1
    score_2: m.Sc2
  }));
  await supabase.from('games').upsert(matchs);
  console.log(`✅ ${matchs.length} Matchs importés`);

  console.log("✨ Migration terminée avec succès !");
}

migrate().catch(console.error);
