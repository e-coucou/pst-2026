	'use client';

	import { useState, useEffect } from 'react';
	import { useRouter } from 'next/navigation'; // <-- AJOUT POUR LE ROUTING
	import { createClient } from '@/utils/supabase/client';
	import RenderStepper from '@/components/Stepper'
	import LiveDraftDraw from '@/components/LiveDraftDraw'
	import { ArrowRight, ArrowLeft, Trophy, ShieldAlert, RefreshCw, Loader2, ChevronUp, ChevronDown, CheckCircle2, Circle, ArrowLeftRight } from 'lucide-react';
	import { logActivity } from '@/utils/log-activity';
	import FavoriStar from '@/components/FavoriStar';
	import { useFavoriId } from '@/hooks/useFavoriId';
	import { makeSkillRating } from '@/lib/elo-engine';

	// --- HELPERS FORMAT DE TOURNOI ---
	// 'classique' = 8 équipes / 2 poules de 4 (demies puis 4 finales)
	// '10_equipes' = 10 équipes / 2 poules de 5 (pas de demies, 5 finales classées)
	// 'ronde' = 10 équipes / système suisse (5 rondes, appariement par classement, pas de poules)
	const getRequiredCount = (format: string) => (format === 'classique' ? 8 : 10);
	const getTeamIds = (format: string) =>
	  format === 'classique'
	    ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
	    : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
	const getGassinIds = (format: string) =>
	  format === '10_equipes' ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'C', 'E', 'G'];

	// Round-robin générique (méthode du cercle) : pour n équipes (pair ou impair, avec bye si
	// impair), génère toutes les paires C(n,2) sans répétition. Vérifié à la main pour n=4 :
	// reproduit exactement l'ancienne séquence figée [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]].
	const generateRoundRobinPairs = (n: number): [number, number][] => {
	  const BYE = -1;
	  const hasBye = n % 2 !== 0;
	  const m = hasBye ? n + 1 : n;
	  let arr: number[] = Array.from({ length: m }, (_, i) => (i < n ? i : BYE));
	  const rounds: [number, number][][] = [];

	  for (let r = 0; r < m - 1; r++) {
	    const roundPairs: [number, number][] = [];
	    for (let i = 0; i < m / 2; i++) {
	      const a = arr[i];
	      const b = arr[m - 1 - i];
	      if (a !== BYE && b !== BYE) {
	        roundPairs.push(a < b ? [a, b] : [b, a]);
	      }
	    }
	    rounds.push(roundPairs);
	    // Rotation : arr[0] fixe, le reste tourne (dernier élément passe en position 1)
	    arr = [arr[0], arr[m - 1], ...arr.slice(1, m - 1)];
	  }

	  // Inversion de l'ordre des rounds (pas des paires à l'intérieur d'un round) : nécessaire
	  // pour retomber exactement sur l'ordre legacy à n=4.
	  return rounds.reverse().flat();
	};

	// Attribution des terrains (format 10_equipes, 2 poules de 5 équipes jouées EN PARALLÈLE sur les
	// 4 mêmes terrains physiques : à chaque ronde, 2 matchs Gassin + 2 matchs Ramatuelle = 4 matchs
	// simultanés, un par terrain — cf. generateRoundRobinPairs, même découpage en 5 rondes pour les
	// deux poules). Avec seulement 4 terrains, il est mathématiquement impossible qu'une équipe joue
	// une fois sur chacun (nombre chromatique d'arêtes de K5 = 5, vérifié par calcul exhaustif) :
	// chaque équipe dispute 4 matchs et ne peut couvrir que 3 terrains distincts sur 4 au mieux.
	// Tables figées ci-dessous = meilleure répartition conjointe trouvée par recherche (les 2 poules
	// ne doivent jamais s'attribuer le même terrain à la même ronde) : les 10 équipes couvrent
	// chacune au moins 3 terrains différents (une couvre les 4). Clé = paire d'index triée "i-j"
	// dans le tableau local de la poule (0..4).
	const POULE5_COURTS: Record<'Gassin' | 'Ramatuelle', Record<string, string>> = {
	  Gassin: {
	    '0-1': 'T2', '0-2': 'T4', '0-3': 'T1', '0-4': 'T3',
	    '1-2': 'T1', '1-3': 'T3', '1-4': 'T2',
	    '2-3': 'T3', '2-4': 'T4',
	    '3-4': 'T4',
	  },
	  Ramatuelle: {
	    '0-1': 'T1', '0-2': 'T1', '0-3': 'T3', '0-4': 'T2',
	    '1-2': 'T4', '1-3': 'T2', '1-4': 'T1',
	    '2-3': 'T4', '2-4': 'T2',
	    '3-4': 'T3',
	  },
	};

	export default function LiveAdminWizard() {
	 const supabase = createClient();
	 const router = useRouter(); // <-- INITIALISATION DU ROUTER
	 const favoriId = useFavoriId();
	 
	 const [isAdmin, setIsAdmin] = useState(false);
	 const [loading, setLoading] = useState(true);
	 const [allProfiles, setAllProfiles] = useState<any[]>([]);
	 
	 // Étape 1 : Sélection
	 const [selectedPointeurs, setSelectedPointeurs] = useState<any[]>([]);
	 const [selectedTireurs, setSelectedTireurs] = useState<any[]>([]);
	 // Cache des confirmations (paiement/présence), conservé même si le joueur est désélectionné puis resélectionné
	 const [confirmedMap, setConfirmedMap] = useState<Record<number, boolean>>({});
	 // Clés d'actions en cours (ex: "P-12", "conf-7") -> désactive le bouton concerné le temps de l'appel Supabase
	 const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());

	 const withPending = async (key: string, fn: () => Promise<void>) => {
	   setPendingKeys(prev => new Set(prev).add(key));
	   try {
	     await fn();
	   } finally {
	     setPendingKeys(prev => {
	       const next = new Set(prev);
	       next.delete(key);
	       return next;
	     });
	   }
	 };
	 
	 // Étape 2 : Draft (Les colonnes que tu vas manipuler)
	 const [draftP, setDraftP] = useState<any[]>([]);
	 const [draftT, setDraftT] = useState<any[]>([]);
	 
	 const [step, setStep] = useState(1);
	 const [status, setStatus] = useState<string>('JOUEURS');
	 const [format, setFormat] = useState<string>('classique');
	 // 'auto' = mélange instantané (comportement historique) ; 'live' = tirage au sort
	 // révélé pair par pair (cf. components/LiveDraftDraw.tsx), pour un tirage en direct.
	 const [teamMode, setTeamMode] = useState<string>('auto');
	 const [refreshing, setRefreshing] = useState(false);

	 useEffect(() => {
	   init();
	   // eslint-disable-next-line react-hooks/exhaustive-deps
	 }, [router]); // Ajout de router dans les dépendances

	 // Extrait de l'effet pour être réutilisable par le bouton "Actualiser" : sans lui, un
	 // changement fait ailleurs (autre onglet, autre admin, ou en base directement) sur
	 // format/team_mode/status restait invisible tant que la page n'était pas rechargée.
	 async function init() {
	     const { data: { user } } = await supabase.auth.getUser();
	     if (!user) { setLoading(false); return; }

	  const { data: tournoi, error: tournoiError } = await supabase.from('live_tournament').select('status, format, team_mode').eq('id', 1).single();
	  if (tournoiError) {
	    // Échec silencieux sinon : ex. colonne pas encore créée en base -> tout retombe sur
	    // les valeurs par défaut ('classique'/'auto') sans que rien ne l'indique à l'écran.
	    console.error('Erreur lecture live_tournament:', tournoiError.message);
	    alert("Erreur de lecture du tournoi : " + tournoiError.message);
	  }
	  if (tournoi?.status) {
	    setStatus(tournoi.status);
	    setStep(1);
	  }
	  setFormat(tournoi?.format || 'classique');
	  setTeamMode(tournoi?.team_mode || 'auto');

	     await fetchPlayersWithElo();
	     
	     // 1. Tentative de récupération d'une sélection déjà existante en base
	     // (inclut aussi les joueurs désélectionnés : role = null, mais confirmed conservé)
	     const { data: existing } = await supabase.from('live_selected').select('*');
	     if (existing && existing.length > 0) {
	       const map: Record<number, boolean> = {};
	       existing.forEach(x => { map[x.player_id] = !!x.confirmed; });
	       setConfirmedMap(map);

	       const defaultSkill = makeSkillRating();
	       const ps = existing.filter(x => x.role === 'Pointeur').map(x => ({ id: x.player_id, nom: x.nom, elo: x.elo_at_selection, modern: x.modern_at_selection, skillMu: x.skill_mu_at_selection ?? defaultSkill.mu, skillSigma: x.skill_sigma_at_selection ?? defaultSkill.sigma, confirmed: !!x.confirmed }));
	       const ts = existing.filter(x => x.role === 'Tireur').map(x => ({ id: x.player_id, nom: x.nom, elo: x.elo_at_selection, modern: x.modern_at_selection, skillMu: x.skill_mu_at_selection ?? defaultSkill.mu, skillSigma: x.skill_sigma_at_selection ?? defaultSkill.sigma, confirmed: !!x.confirmed }));
	       setSelectedPointeurs(ps);
	       setSelectedTireurs(ts);

	 	  // 2. Tentative DE RECONSTRUCTION DU DRAFT (Si les équipes existent déjà)
	       const { data: existingTeams } = await supabase.from('live_teams').select('*').neq('id', 'Z').order('id', { ascending: true });
	     
	       if (existingTeams && existingTeams.length > 0) {
	         // On reconstruit l'ordre des pointeurs et tireurs basé sur l'ordre des équipes A, B, C...
	         const orderedP = existingTeams.map(t => ps.find(p => p.id === t.pointeur_id)).filter(Boolean);
	         const orderedT = existingTeams.map(t => ts.find(tireur => tireur.id === t.tireur_id)).filter(Boolean);
	       
	         setDraftP(orderedP);
	         setDraftT(orderedT);
	       }
	  }
	     setLoading(false);
	 }

	 const fetchPlayersWithElo = async () => {
	   const { data: profiles } = await supabase.from('profiles').select('id, nom');
	   const { data: elos } = await supabase.from('elo_history').select('player_id, elo_value, elo_modern_value, skill_mu, skill_sigma').order('game_id', { ascending: false });

	   if (profiles && elos) {
	     const defaultSkill = makeSkillRating();
	     const playersDetailed = profiles.map(p => {
	       const lastElo = elos.find(e => e.player_id === p.id);
	       return {
	         ...p,
	         elo: lastElo ? lastElo.elo_value : 100,
	         modern: lastElo ? lastElo.elo_modern_value : 100,
	         // "Dynamique" (bayésien) : mu/sigma par joueur, valeurs par défaut openskill si le
	         // joueur n'a jamais joué (cf. lib/elo-engine.ts#makeSkillRating).
	         skillMu: lastElo?.skill_mu ?? defaultSkill.mu,
	         skillSigma: lastElo?.skill_sigma ?? defaultSkill.sigma,
	       };
	     }).sort((a, b) => b.elo - a.elo);
	     setAllProfiles(playersDetailed);
	   }
	 };

	 const saveOneToDatabase = async (player: any, role: string) => {
	   // onConflict: player_id -> si le joueur a déjà une ligne (ex: désélectionné plus tôt),
	   // on ne fait que ré-affecter son rôle. Comme 'confirmed' n'est pas dans le payload,
	   // sa valeur existante en base n'est jamais écrasée.
	   await supabase.from('live_selected').upsert({
	     player_id: player.id,
	     role: role,
	     elo_at_selection: player.elo,
	     modern_at_selection: player.modern,
	     skill_mu_at_selection: player.skillMu,
	     skill_sigma_at_selection: player.skillSigma,
	     nom: player.nom
	   }, { onConflict: 'player_id' });
	   logActivity(supabase, 'ADMIN_SELECT_PLAYER', { player_id: player.id, nom: player.nom, role });
	 };

	 const removeOneFromDatabase = async (playerId: number) => {
	   // On ne supprime plus la ligne : ça effacerait 'confirmed' (ex: joueur qui a déjà payé).
	   // On libère seulement le rôle, le joueur redevient sélectionnable.
	   await supabase.from('live_selected').update({ role: null }).eq('player_id', playerId);
	   logActivity(supabase, 'ADMIN_REMOVE_PLAYER', { player_id: playerId });
	 };

	 const toggleConfirmed = async (playerId: number, list: any[], setList: any) => {
	   const nextConfirmed = !confirmedMap[playerId];
	   setConfirmedMap(prev => ({ ...prev, [playerId]: nextConfirmed }));
	   setList(list.map(p => p.id === playerId ? { ...p, confirmed: nextConfirmed } : p));
	   await supabase.from('live_selected').update({ confirmed: nextConfirmed }).eq('player_id', playerId);
	   logActivity(supabase, 'ADMIN_TOGGLE_CONFIRMED', { player_id: playerId, confirmed: nextConfirmed });
	 };



	 // --- SAUVEGARDE EN TABLE ET PASSAGE ÉTAPE 2 ---
	 const finalizeSelectionAndSave = async () => {
	   setLoading(true);
	   try {
	     // 1. On vide la table de sélection actuelle
	     const { error: deleteError } = await supabase
	       .from('live_selected')
	       .delete()
	       .filter('player_id', 'neq', 25345524); 
	     if (deleteError) throw deleteError;      

	     // 2. On prépare l'insert
	     const toInsert = [
	       ...selectedPointeurs.map(p => ({ player_id: p.id, role: 'Pointeur', elo_at_selection: p.elo, modern_at_selection:p.modern, skill_mu_at_selection: p.skillMu, skill_sigma_at_selection: p.skillSigma, nom: p.nom, confirmed: !!p.confirmed })),
	       ...selectedTireurs.map(t => ({ player_id: t.id, role: 'Tireur', elo_at_selection: t.elo, modern_at_selection:t.modern, skill_mu_at_selection: t.skillMu, skill_sigma_at_selection: t.skillSigma, nom: t.nom, confirmed: !!t.confirmed }))
	     ];
	     // mise à jour status du Tournois
	     const { error } = await supabase.from('live_selected').insert(toInsert);
	     await supabase.from('live_tournament').update({ status: 'EQUIPES' }).eq('id', 1);
	     setStatus('EQUIPES');      
	     if (error) throw error;

	     // 3. Initialisation du draft visuel
	  await supabase.from('live_teams').delete().neq('id', 'Z');

	     if (teamMode === 'live') {
	       // Mode tirage en direct : le draft démarre vide, LiveDraftDraw le peuple pair par pair.
	       setDraftP([]);
	       setDraftT([]);
	     } else {
	       // On prépare le mélange initial
	       const sP = [...selectedPointeurs].sort((a, b) => b.elo - a.elo);
	       const sT = [...selectedTireurs].sort((a, b) => b.elo - a.elo);
	       const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
	       const half = requiredCount / 2;

	       const newP = [...shuffle(sP.slice(0, half)), ...shuffle(sP.slice(half, requiredCount))];
	       const newT = [...shuffle(sT.slice(half, requiredCount)), ...shuffle(sT.slice(0, half))];

	       setDraftP(newP);
	       setDraftT(newT);

	       // CRUCIAL : On enregistre immédiatement en base pour que le refresh fonctionne
	       await syncTeamsToDatabase(newP, newT);
	     }
	  logActivity(supabase, 'ADMIN_FINALIZE_TEAMS', { nb_pointeurs: selectedPointeurs.length, nb_tireurs: selectedTireurs.length });
	  setStep(2);
	  
	} catch (err: any) {
	    alert("Erreur de sauvegarde base de données : " + err.message);
	   } finally {
	    setLoading(false);
	}
	};

	 const syncTeamsToDatabase = async (pList: any[], tList: any[]) => {
	   const teamIds = getTeamIds(format);
	   const gassinIds = getGassinIds(format);
	   const teamsToInsert = pList.map((p, i) => ({
	     id: teamIds[i],
	     tireur_id: tList[i].id,
	     pointeur_id: p.id,
	     elo_start: (tList[i].elo + p.elo) / 2,
	     elo_start_pointeur: p.elo,
	     elo_start_tireur: tList[i].elo,
	     modern_start: (tList[i].modern + p.modern) / 2 || 100,
	     // "Dynamique" : pas de moyenne d'équipe (contrairement à modern_start) — 4 colonnes
	     // séparées, chaque joueur garde son propre mu/sigma au sein de la doublette.
	     skill_mu_pointeur: p.skillMu,
	     skill_sigma_pointeur: p.skillSigma,
	     skill_mu_tireur: tList[i].skillMu,
	     skill_sigma_tireur: tList[i].skillSigma,
	     poule: format === 'ronde' ? 'Ronde' : (gassinIds.includes(teamIds[i]) ? 'Gassin' : 'Ramatuelle')
	   }));

	   // On utilise upsert pour mettre à jour les lignes existantes A, B, C...
	   await supabase.from('live_teams').upsert(teamsToInsert);
	 };

	const handleInitialShuffle = async () => {
	 const sP = [...selectedPointeurs].sort((a, b) => b.elo - a.elo);
	 const sT = [...selectedTireurs].sort((a, b) => b.elo - a.elo);
	 const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
	 const half = getRequiredCount(format) / 2;

	 const newP = [...shuffle(sP.slice(0, half)), ...shuffle(sP.slice(half, half * 2))];
	 const newT = [...shuffle(sT.slice(half, half * 2)), ...shuffle(sT.slice(0, half))];

	 setDraftP(newP);
	 setDraftT(newT);
	 
	 // Sauvegarde immédiate en base
	 await syncTeamsToDatabase(newP, newT);
	 logActivity(supabase, 'ADMIN_SHUFFLE_TEAMS');
	};


	const movePlayer = async (index: number, direction: number, list: any[], setList: any) => {
	 const newList = [...list];
	 const target = index + direction;
	 if (target < 0 || target >= newList.length) return;
	 [newList[index], newList[target]] = [newList[target], newList[index]];
	 
	 setList(newList);

	 // On identifie quelle liste a changé pour envoyer les données fraîches à syncTeamsToDatabase
	 if (list === draftP) {
	   await syncTeamsToDatabase(newList, draftT);
	 } else {
	   await syncTeamsToDatabase(draftP, newList);
	 }
	};

	// Échange les rôles P/T d'une équipe déjà formée (même équipe/index, sans toucher aux
	// autres) : utile après un tirage en direct pour corriger une inversion.
	const swapRoles = async (index: number) => {
	 const newP = [...draftP];
	 const newT = [...draftT];
	 [newP[index], newT[index]] = [newT[index], newP[index]];
	 setDraftP(newP);
	 setDraftT(newT);
	 await syncTeamsToDatabase(newP, newT);
	 logActivity(supabase, 'ADMIN_SWAP_ROLES', { team_index: index });
	};

	// Callback du tirage en direct (LiveDraftDraw) : une paire vient d'être révélée,
	// on l'ajoute au draft et on sauvegarde immédiatement (même pattern que les autres
	// mutations du draft, pour survivre à un rafraîchissement en plein tirage).
	const handlePairComplete = async (pointeur: any, tireur: any) => {
	 const newP = [...draftP, pointeur];
	 const newT = [...draftT, tireur];
	 setDraftP(newP);
	 setDraftT(newT);
	 await syncTeamsToDatabase(newP, newT);
	 logActivity(supabase, 'ADMIN_DRAW_PAIR', { pointeur_id: pointeur.id, tireur_id: tireur.id });
	};

	 const confirmAndCreateTournament = async () => {
	   setLoading(true);
	   try {
	     // 1. Nettoyage
	     await supabase.from('live_matches').delete().gte('id', 0);
	     await supabase.from('live_teams').delete().neq('id', 'Z');

	     // 2. Insertion des équipes (ton code est correct ici)
	     const teamIds = getTeamIds(format);
	     const gassinIds = getGassinIds(format);
	     const teamsToInsert = draftP.map((p, i) => ({
	       id: teamIds[i],
	       tireur_id: draftT[i].id,
	       pointeur_id: p.id,
	       elo_start: (draftT[i].elo + p.elo) / 2,
	       elo_start_pointeur: p.elo,
	       elo_start_tireur: draftT[i].elo,
	       modern_start: (draftT[i].modern + p.modern) / 2 || 100,
	       skill_mu_pointeur: p.skillMu,
	       skill_sigma_pointeur: p.skillSigma,
	       skill_mu_tireur: draftT[i].skillMu,
	       skill_sigma_tireur: draftT[i].skillSigma,
	       poule: format === 'ronde' ? 'Ronde' : (gassinIds.includes(teamIds[i]) ? 'Gassin' : 'Ramatuelle')
	     }));

	     const { error: teamsError } = await supabase.from('live_teams').insert(teamsToInsert);
	     if (teamsError) throw new Error("Insertion des équipes échouée : " + teamsError.message);

	     // 3. Génération des matches
	     const pouleMatches: any[] = [];

	     if (format === 'ronde') {
	       // Ronde 1 : tirage aléatoire, appariement séquentiel. Les rondes suivantes sont
	       // générées une par une depuis /live/ronde (appariement dépendant des résultats).
	       const shuffled = [...teamIds].sort(() => Math.random() - 0.5);
	       for (let i = 0; i < shuffled.length; i += 2) {
	         pouleMatches.push({
	           poule: 'Ronde',
	           type: 'Poule',
	           tableau: 'Principal',
	           team1_id: shuffled[i],
	           team2_id: shuffled[i + 1],
	           status: 'EN_ATTENTE',
	           round: 1
	         });
	       }
	     } else {
	       // Round-robin générique (cf. generateRoundRobinPairs)
	       const generateOrderedMatches = (ids: string[], village: 'Gassin' | 'Ramatuelle') => {
	         const pairs = generateRoundRobinPairs(ids.length);
	         pairs.forEach(([idx1, idx2]) => {
	           pouleMatches.push({
	             poule: village,
	             type: 'Poule',
	             tableau: 'Principal',
	             team1_id: ids[idx1],
	             team2_id: ids[idx2],
	             status: 'EN_ATTENTE',
	             terrain: ids.length === 5 ? POULE5_COURTS[village][`${idx1}-${idx2}`] : null
	           });
	         });
	       };

	       // Appel de la génération pour les deux poules
	       const ramatuelleIds = teamIds.filter(id => !gassinIds.includes(id));
	       // Format 10_equipes : la structure round-robin met toujours l'équipe d'index local 2 au
	       // repos à la 1ère ronde (indépendamment des lettres, cf. POULE5_COURTS/generateRoundRobinPairs).
	       // On réordonne donc les tableaux locaux pour que ce soit E (Gassin) et J (Ramatuelle) qui
	       // occupent cet index, afin qu'elles soient les premières équipes à ne pas jouer.
	       const gassinRR = format === '10_equipes' ? ['A', 'B', 'E', 'D', 'C'] : gassinIds;
	       const ramatuelleRR = format === '10_equipes' ? ['F', 'G', 'J', 'I', 'H'] : ramatuelleIds;
	       generateOrderedMatches(gassinRR, 'Gassin');
	       generateOrderedMatches(ramatuelleRR, 'Ramatuelle');
	     }

	     // 4. Envoi en base
	     const { error: matchesError } = await supabase.from('live_matches').insert(pouleMatches);
	     if (matchesError) throw new Error("Insertion des matchs échouée : " + matchesError.message);
	     await supabase.from('live_tournament').update({ status: 'POULES' }).eq('id', 1);
	     logActivity(supabase, 'ADMIN_START_TOURNAMENT');

	//      alert("🔥 C'est parti ! Le tournoi est en ligne.");
	     router.push(format === 'ronde' ? '/live/ronde' : '/live/poules');
	     
	   } catch (err: any) {
	     alert(err.message);
	   } finally {
	     setLoading(false);
	   }
	 };

	 if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-black italic animate-pulse">CHARGEMENT...</div>;
	//  const selectionOK = false;
	 const requiredCount = getRequiredCount(format);
	 const selectionOK = (selectedPointeurs.length === requiredCount && selectedTireurs.length === requiredCount);
	 // En mode tirage en direct, le draft se peuple pair par pair : on bloque le lancement
	 // tant qu'il n'est pas complet (en mode auto, toujours vrai instantanément).
	 const draftComplete = draftP.length === requiredCount;
	 // Pools restants pour le tirage en direct (joueurs sélectionnés pas encore dans le draft).
	 const drawnPIds = new Set(draftP.map(p => p.id));
	 const drawnTIds = new Set(draftT.map(t => t.id));
	 const pointeurPool = selectedPointeurs.filter(p => !drawnPIds.has(p.id));
	 const tireurPool = selectedTireurs.filter(t => !drawnTIds.has(t.id));

	 const handleRefresh = async () => {
	   setRefreshing(true);
	   await init();
	   setRefreshing(false);
	 };

	 const backSelection = async () => {
	 	setStep(1);
	   await supabase.from('live_tournament').update({ status: 'JOUEURS' }).eq('id', 1);
	   setStatus('JOUEURS');
	 };

	 const changeFormat = async (next: string) => {
	   setFormat(next);
	   await supabase.from('live_tournament').update({ format: next }).eq('id', 1);
	   logActivity(supabase, 'ADMIN_SET_FORMAT', { format: next });
	 };

	 const changeTeamMode = async (next: string) => {
	   setTeamMode(next);
	   await supabase.from('live_tournament').update({ team_mode: next }).eq('id', 1);
	   logActivity(supabase, 'ADMIN_SET_TEAM_MODE', { team_mode: next });
	 };

	 return (
	   <div className="min-h-screen bg-black text-white p-4 md:p-12">
	     <div className="max-w-7xl mx-auto">
	       <header className="mb-8 md:mb-12 flex justify-between items-center border-b border-white/10 pb-6 md:pb-8 group">
	         <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter group-hover:text-red-600">
	           Live <span className="text-red-600 group-hover:text-white">équipe</span>
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
	           <button onClick={() => backSelection()} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
	             <ArrowLeft size={14} /> <span className="hidden md:inline">Sélection</span>
	           </button>
	           <button onClick={() => router.push('/live/poules')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
	             <ArrowRight size={14} /> <span className="hidden md:inline">Poules</span>
			</button>
	         </div>
	       </header>

	       {/* BARRE DE RÉGLAGES : Format + Constitution des équipes, traités comme des réglages
	            de page (au même niveau que les actions d'en-tête) plutôt que comme un bloc de
	            contenu — évite d'empiler encore une section pleine largeur avant le Stepper.
	            Grisage du format : verrouillé une fois qu'on a quitté l'étape JOUEURS, ou si la
	            sélection en cours dépasse déjà le nombre requis par ce format (ex: 10 joueurs
	            sélectionnés en Ronde, retour impossible vers Classique tant qu'on n'est pas
	            redescendu à 8 via les croix de suppression). */}
	       {step === 1 && (
	         <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-8 md:mb-10">
	           <div className="flex items-center gap-2 flex-wrap justify-center">
	             <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em]">Format</span>
	             {(['classique', '10_equipes', 'ronde'] as const).map(f => (
	               <button
	                 key={f}
	                 onClick={() => changeFormat(f)}
	                 disabled={status !== 'JOUEURS' || selectedPointeurs.length > getRequiredCount(f) || selectedTireurs.length > getRequiredCount(f)}
	                 title={selectedPointeurs.length > getRequiredCount(f) || selectedTireurs.length > getRequiredCount(f) ? `Réduis la sélection à ${getRequiredCount(f)} pointeurs/tireurs pour choisir ce format` : undefined}
	                 className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 ${
	                   format === f ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
	                 }`}
	               >
	                 {f === 'classique' ? 'Classique' : f === '10_equipes' ? '10 équipes' : 'Ronde'}
	                 <span className="hidden lg:inline text-zinc-500">
	                   {f === 'classique' ? ' (8 équipes)' : f === 'ronde' ? ' (10 équipes)' : ''}
	                 </span>
	               </button>
	             ))}
	           </div>

	           <div className="hidden sm:block w-px h-5 bg-white/10" />

	           <div className="flex items-center gap-2 flex-wrap justify-center">
	             <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em]">Équipes</span>
	             {(['auto', 'live'] as const).map(m => (
	               <button
	                 key={m}
	                 onClick={() => changeTeamMode(m)}
	                 disabled={status !== 'JOUEURS'}
	                 className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
	                   teamMode === m ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'
	                 }`}
	               >
	                 {m === 'auto' ? 'Automatique' : 'Tirage en direct'}
	               </button>
	             ))}
	           </div>
	         </div>
	       )}

		<RenderStepper currentStatus = {status} format={format} />

	       {step === 1 ? (
	         /* ÉTAPE 1 : SÉLECTION */
	         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

	         {/* SECTION BOUTON POUR LANCER LES EQUIPES : pas de div englobante quand caché, pour
	              ne pas laisser une ligne de grille vide (gap-8) créer un grand espace mort. */}
	         {selectionOK && (
	         <div className="md:col-span-3 flex justify-center">
	           <div className="mb-4 p-8 rounded-[2.5rem] bg-red-600 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-bounce-subtle">
	           <div className="text-center md:text-left">
	             <h3 className="text-2xl font-black uppercase italic text-white leading-none mb-2">Quorum !</h3>
	             <p className="text-red-100 font-bold text-sm">La sélection des Joueurs est terminé. Prêt pour la constitution des équipes ?</p>
	           </div>
	           <button
	             onClick={finalizeSelectionAndSave}
	             className="w-full md:w-auto bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-white hover:text-black transition-all active:scale-95"
	           >
	             <Trophy size={20} />
	             Constitution des équipes
	           </button>
	           </div>
	         </div>
	         )}


	            <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 h-[600px] flex flex-col">
	             <h2 className="text-center text-sm font-black uppercase text-zinc-500 mb-4 tracking-[0.2em]">Pétanquistes</h2>


	             <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
	               {allProfiles.map(p => {
	                 const isP = selectedPointeurs.find(x => x.id === p.id);
	                 const isT = selectedTireurs.find(x => x.id === p.id);
	                 const unavailableP = !!(isP || isT || selectedPointeurs.length >= requiredCount);
	                 const unavailableT = !!(isP || isT || selectedTireurs.length >= requiredCount);
	                 const keyP = `P-${p.id}`;
	                 const keyT = `T-${p.id}`;
	                 const pendingP = pendingKeys.has(keyP);
	                 const pendingT = pendingKeys.has(keyT);
	                 return (
	                   <div key={p.id} className={`p-3 rounded-2xl border transition-all ${isP || isT ? 'opacity-20 bg-black' : 'bg-zinc-900 border-white/5 hover:border-red-600'}`}>
	                     <div className="flex justify-between items-center">
	                       <span className="font-bold text-sm uppercase">{p.nom} <FavoriStar active={p.id === favoriId} size={10} /> <span className="text-zinc-400 ml-2 text-[11px]">{p.elo.toFixed(0)} / {p.modern.toFixed(0)}</span></span>
	                       <div className="flex gap-2">
	                         <button
	                           onClick={() => withPending(keyP, async () => {
	                             setSelectedPointeurs(prev => [...prev, { ...p, confirmed: !!confirmedMap[p.id] }]);
	                             await saveOneToDatabase(p, 'Pointeur');
	                           })}
	                           disabled={unavailableP || pendingP}
	                           className={`bg-purple-600 text-sm font-black px-2 py-1 rounded-lg uppercase w-7 flex items-center justify-center disabled:opacity-40 ${unavailableP ? 'hidden' : ''}`}
	                         >
	                           {pendingP ? <Loader2 size={12} className="animate-spin" /> : 'P'}
	                         </button>
	                         <button
	                           onClick={() => withPending(keyT, async () => {
	                             setSelectedTireurs(prev => [...prev, { ...p, confirmed: !!confirmedMap[p.id] }]);
	                             await saveOneToDatabase(p, 'Tireur');
	                           })}
	                           disabled={unavailableT || pendingT}
	                           className={`bg-orange-600 text-sm font-black px-2 py-1 rounded-lg uppercase w-7 flex items-center justify-center disabled:opacity-40 ${unavailableT ? 'hidden' : ''}`}
	                         >
	                           {pendingT ? <Loader2 size={12} className="animate-spin" /> : 'T'}
	                         </button>
	                       </div>
	                     </div>
	                   </div>
	                 );
	               })}
	             </div>
	           </div>

	           <div className="bg-purple-900/5 border border-purple-500/50 p-6 rounded-[2.5rem]">
	             <h2 className={`text-center text-xs font-black uppercase mb-4 italic py-1 rounded-xl transition-colors ${selectedPointeurs.length > requiredCount ? 'bg-red-600 text-white' : 'text-purple-500'}`}>Pointeurs ({selectedPointeurs.length}/{requiredCount})</h2>
	             <div className="space-y-2">
	               {selectedPointeurs.map(p => {
	                 const confKey = `conf-${p.id}`;
	                 const rmKey = `rm-${p.id}`;
	                 const pendingConf = pendingKeys.has(confKey);
	                 const pendingRm = pendingKeys.has(rmKey);
	                 return (
	                 <div key={p.id} className="p-3 bg-purple-600/20 border border-purple-500 rounded-2xl flex justify-between items-center gap-2">
	                   <button
	                     onClick={() => withPending(confKey, () => toggleConfirmed(p.id, selectedPointeurs, setSelectedPointeurs))}
	                     disabled={pendingConf}
	                     title={p.confirmed ? 'Présence confirmée' : 'Marquer comme confirmé'}
	                     className="shrink-0 disabled:opacity-40"
	                   >
	                     {pendingConf
	                       ? <Loader2 size={18} className="animate-spin text-zinc-400" />
	                       : p.confirmed
	                       ? <CheckCircle2 size={18} className="text-green-500" />
	                       : <Circle size={18} className="text-zinc-400 hover:text-white transition-colors" />}
	                   </button>
	                   <span className="text-xs font-bold uppercase flex-1 truncate">{p.nom} <FavoriStar active={p.id === favoriId} size={10} /></span>
	                   <button
	                     onClick={() => withPending(rmKey, async () => { setSelectedPointeurs(prev => prev.filter(x => x.id !== p.id)); await removeOneFromDatabase(p.id); })}
	                     disabled={pendingRm}
	                     className="text-purple-500 font-black text-xs px-2 disabled:opacity-40"
	                   >
	                     {pendingRm ? <Loader2 size={12} className="animate-spin inline" /> : '✕'}
	                   </button>
	                 </div>
	                 );
	               })}
	             </div>
	           </div>

	           <div className="bg-orange-900/5 border border-orange-500/50 p-6 rounded-[2.5rem]">
	             <h2 className={`text-center text-xs font-black uppercase mb-4 italic py-1 rounded-xl transition-colors ${selectedTireurs.length > requiredCount ? 'bg-red-600 text-white' : 'text-orange-500'}`}>Tireurs ({selectedTireurs.length}/{requiredCount})</h2>
	             <div className="space-y-2">
	               {selectedTireurs.map(p => {
	                 const confKey = `conf-${p.id}`;
	                 const rmKey = `rm-${p.id}`;
	                 const pendingConf = pendingKeys.has(confKey);
	                 const pendingRm = pendingKeys.has(rmKey);
	                 return (
	                 <div key={p.id} className="p-3 bg-orange-600/20 border border-orange-500 rounded-2xl flex justify-between items-center gap-2">
	                   <button
	                     onClick={() => withPending(confKey, () => toggleConfirmed(p.id, selectedTireurs, setSelectedTireurs))}
	                     disabled={pendingConf}
	                     title={p.confirmed ? 'Présence confirmée' : 'Marquer comme confirmé'}
	                     className="shrink-0 disabled:opacity-40"
	                   >
	                     {pendingConf
	                       ? <Loader2 size={18} className="animate-spin text-zinc-400" />
	                       : p.confirmed
	                       ? <CheckCircle2 size={18} className="text-green-500" />
	                       : <Circle size={18} className="text-zinc-400 hover:text-white transition-colors" />}
	                   </button>
	                   <span className="text-xs font-bold uppercase flex-1 truncate">{p.nom} <FavoriStar active={p.id === favoriId} size={10} /></span>
	                   <button
	                     onClick={() => withPending(rmKey, async () => { setSelectedTireurs(prev => prev.filter(x => x.id !== p.id)); await removeOneFromDatabase(p.id); })}
	                     disabled={pendingRm}
	                     className="text-orange-500 font-black text-xs px-2 disabled:opacity-40"
	                   >
	                     {pendingRm ? <Loader2 size={12} className="animate-spin inline" /> : '✕'}
	                   </button>
	                 </div>
	                 );
	               })}
	             </div>
	           </div>

	        </div>
	       ) : (
	         /* ÉTAPE 2 : DRAFT INTERACTIF */
	         <div className="space-y-12">


	         <div className="md:col-span-3 flex justify-center mt-1">
	      {/* SECTION BOUTON POUR LANCER LES DEMIS */}
	       {selectionOK && draftComplete && (
	         <div className="mb-12 p-8 rounded-[2.5rem] bg-red-600 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(220,38,38,0.3)] animate-bounce-subtle">
	           <div className="text-center md:text-left">
	             <h3 className="text-2xl font-black uppercase italic text-white leading-none mb-2">En Lice !</h3>
	             <p className="text-red-100 font-bold text-sm">Si les Doublettes sont constituées, lance la génération du Tournois...</p>
	           </div>
	           <button 
	             onClick={confirmAndCreateTournament}
	             className="w-full md:w-auto bg-black text-white px-10 py-4 rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-white hover:text-black transition-all active:scale-95"
	           >
	             <Trophy size={20} />
	             Lancement du Tournois
	           </button>
	         </div>
	       )}
	       </div>

	           <div className="flex justify-between items-end">
	              <div>
	                 <h2 className="text-3xl font-black italic uppercase">Doublettes</h2>
	                 <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">Utilise les flèches pour déplacer un joueur et changer son partenaire</p>
	              </div>
	              {teamMode === 'auto' && (
	                <button onClick={handleInitialShuffle} className="bg-zinc-900 hover:bg-zinc-800 p-4 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase transition-colors">
	                  <RefreshCw size={14} className="text-red-600"/> Re-mélanger Aléatoirement
	                </button>
	              )}
	           </div>

	           <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
	              {/* PANNEAU DE CONTRÔLE : flèches manuelles (auto) ou tirage en direct (live) */}
	              {teamMode === 'live' ? (
	                <LiveDraftDraw
	                  pointeurPool={pointeurPool}
	                  tireurPool={tireurPool}
	                  favoriId={favoriId}
	                  onPairComplete={handlePairComplete}
	                />
	              ) : (
	              <div className="grid grid-cols-2 gap-4 bg-zinc-900/30 p-8 rounded-[3rem] border border-white/5">
	                 <div className="space-y-2">
	                   <p className="text-center text-[10px] font-black text-purple-500 uppercase mb-4 tracking-tighter underline decoration-2 underline-offset-4">Pointeurs</p>
	                   {draftP.map((p, i) => (
	                     <div key={p.id} className="flex items-center justify-between p-3 bg-black rounded-xl border border-white/5">
	                       <span className="text-[10px] font-bold uppercase truncate max-w-[80px] text-purple-400">{p.nom} <FavoriStar active={p.id === favoriId} size={10} /></span>
	                       <div className="flex gap-1">
	                         <button onClick={() => movePlayer(i, -1, draftP, setDraftP)} aria-label="Monter dans la liste" className="p-1 hover:text-red-600 transition-colors"><ChevronUp size={16}/></button>
	                         <button onClick={() => movePlayer(i, 1, draftP, setDraftP)} aria-label="Descendre dans la liste" className="p-1 hover:text-red-600 transition-colors"><ChevronDown size={16}/></button>
	                       </div>
	                     </div>
	                   ))}
	                 </div>
	                 <div className="space-y-2">
	                   <p className="text-center text-[10px] font-black text-orange-500 uppercase mb-4 tracking-tighter underline decoration-2 underline-offset-4">Tireurs</p>
	                   {draftT.map((t, i) => (
	                     <div key={t.id} className="flex items-center justify-between p-3 bg-black rounded-xl border border-white/5">
	                       <div className="flex gap-1">
	                         <button onClick={() => movePlayer(i, -1, draftT, setDraftT)} aria-label="Monter dans la liste" className="p-1 hover:text-red-600 transition-colors"><ChevronUp size={16}/></button>
	                         <button onClick={() => movePlayer(i, 1, draftT, setDraftT)} aria-label="Descendre dans la liste" className="p-1 hover:text-red-600 transition-colors"><ChevronDown size={16}/></button>
	                       </div>
	                       <span className="text-[10px] font-bold uppercase truncate max-w-[80px] text-orange-400">{t.nom} <FavoriStar active={t.id === favoriId} size={10} /></span>
	                     </div>
	                   ))}
	                 </div>
	              </div>
	              )}

	              {/* RÉCAPITULATIF VISUEL PAR ÉQUIPE / POULE */}
	              <div className="space-y-3">
	                 <h3 className="text-[10px] font-black text-zinc-400 uppercase text-center mb-4 tracking-[0.3em]">Aperçu des Équipes</h3>
	                 {draftP.map((p, i) => {
	                   const tId = getTeamIds(format)[i];
	                   const isRonde = format === 'ronde';
	                   const isGassin = !isRonde && getGassinIds(format).includes(tId);
	                   return (
	                     <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${isRonde ? 'border-white/10 bg-white/5' : isGassin ? 'border-blue-900/30 bg-blue-900/5' : 'border-red-900/30 bg-red-900/5'}`}>
	                       <span className="font-black italic text-red-600 w-8">#{tId}</span>
	                       <div className="flex-1 flex justify-center gap-4 text-[11px] font-black uppercase">
	                         <span className="text-purple-400">{p.nom} <FavoriStar active={p.id === favoriId} size={10} /></span>
	                         <span className="text-zinc-400">& {((p.elo+draftT[i].elo)/2).toFixed(1)} &</span>
	                         <span className="text-orange-400">{draftT[i].nom} <FavoriStar active={draftT[i].id === favoriId} size={10} /></span>
	                       </div>
	                       <button
	                         onClick={() => swapRoles(i)}
	                         title="Échanger les rôles P/T de cette équipe"
	                         className="text-zinc-500 hover:text-red-600 p-1 transition-colors shrink-0"
	                       >
	                         <ArrowLeftRight size={14} />
	                       </button>
	                       {!isRonde && (
	                         <span className="text-[8px] font-black text-zinc-500 w-16 text-right uppercase tracking-tighter">
	                           {isGassin ? 'Gassin' : 'Ramatuelle'}
	                         </span>
	                       )}
	                     </div>
	                   )
	                 })}
	              </div>
	           </div>

	         </div>
	       )}
	     </div>
	   </div>
	 );
	}
