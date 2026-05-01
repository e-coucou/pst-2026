'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // <-- AJOUT POUR LE ROUTING
import { createClient } from '@/utils/supabase/client';
import RenderStepper from '@/components/Stepper'
import { ArrowRight, ShieldAlert, RefreshCw, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

export default function LiveAdminWizard() {
  const supabase = createClient();
  const router = useRouter(); // <-- INITIALISATION DU ROUTER
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  
  // Étape 1 : Sélection
  const [selectedPointeurs, setSelectedPointeurs] = useState<any[]>([]);
  const [selectedTireurs, setSelectedTireurs] = useState<any[]>([]);
  
  // Étape 2 : Draft (Les colonnes que tu vas manipuler)
  const [draftP, setDraftP] = useState<any[]>([]);
  const [draftT, setDraftT] = useState<any[]>([]);
  
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<string>('JOUEURS');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

	  const { data: tournoi } = await supabase.from('live_tournament').select('status').eq('id', 1).single();
	  if (tournoi?.status) {
	    setStatus(tournoi.status);
	  }

      await fetchPlayersWithElo();
      
      // Tentative de récupération d'une sélection déjà existante en base
      const { data: existing } = await supabase.from('live_selected').select('*');
      if (existing && existing.length > 0) {
        const ps = existing.filter(x => x.role === 'Pointeur').map(x => ({ id: x.player_id, nom: x.nom, elo: x.elo_at_selection, modern: x.modern_at_selection }));
        const ts = existing.filter(x => x.role === 'Tireur').map(x => ({ id: x.player_id, nom: x.nom, elo: x.elo_at_selection, modern: x.modern_at_selection }));
        setSelectedPointeurs(ps);
        setSelectedTireurs(ts);
      }

      setLoading(false);
    }
    init();
  }, [router]); // Ajout de router dans les dépendances

  const fetchPlayersWithElo = async () => {
    const { data: profiles } = await supabase.from('profiles').select('id, nom');
    const { data: elos } = await supabase.from('elo_history').select('player_id, elo_value, elo_modern_value').order('game_id', { ascending: false });

    if (profiles && elos) {
      const playersDetailed = profiles.map(p => {
        const lastElo = elos.find(e => e.player_id === p.id);
        return { ...p, elo: lastElo ? lastElo.elo_value : 100 , modern: lastElo ? lastElo.elo_modern_value : 100 };
      }).sort((a, b) => b.elo - a.elo);
      setAllProfiles(playersDetailed);
    }
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
        ...selectedPointeurs.map(p => ({ player_id: p.id, role: 'Pointeur', elo_at_selection: p.elo, modern_at_selection:p.modern, nom: p.nom })),
        ...selectedTireurs.map(t => ({ player_id: t.id, role: 'Tireur', elo_at_selection: t.elo, modern_at_selection:t.modern, nom: t.nom }))
      ];

      const { error } = await supabase.from('live_selected').insert(toInsert);
      await supabase.from('live_tournament').update({ status: 'EQUIPES' }).eq('id', 1);
      setStatus('EQUIPES');

      if (error) throw error;

      // 3. Initialisation du draft visuel
      handleInitialShuffle();
      setStep(2);
    } catch (err: any) {
      alert("Erreur de sauvegarde base de données : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialShuffle = () => {
    const sP = [...selectedPointeurs].sort((a, b) => b.elo - a.elo);
    const sT = [...selectedTireurs].sort((a, b) => b.elo - a.elo);
    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);

    // Ta règle : P (1-4 top, 5-8 bottom) / T (1-4 bottom, 5-8 top)
    setDraftP([...shuffle(sP.slice(0, 4)), ...shuffle(sP.slice(4, 8))]);
    setDraftT([...shuffle(sT.slice(4, 8)), ...shuffle(sT.slice(0, 4))]);
  };

  const movePlayer = (index: number, direction: number, list: any[], setList: any) => {
    const newList = [...list];
    const target = index + direction;
    if (target < 0 || target >= newList.length) return;
    [newList[index], newList[target]] = [newList[target], newList[index]];
    setList(newList);
  };


  const confirmAndCreateTournament = async () => {
    setLoading(true);
    try {
      // 1. Nettoyage
      await supabase.from('live_matches').delete().gte('id', 0);
      await supabase.from('live_teams').delete().neq('id', 'Z');

      // 2. Insertion des équipes (ton code est correct ici)
      const teamIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const teamsToInsert = draftP.map((p, i) => ({
        id: teamIds[i],
        tireur_id: draftT[i].id,
        pointeur_id: p.id,
        elo_start: (draftT[i].elo + p.elo) / 2,
        elo_start_pointeur: p.elo,
        elo_start_tireur: draftT[i].elo,
        modern_start: (draftT[i].modern + p.modern) / 2 || 100,
        poule: ['A', 'C', 'E', 'G'].includes(teamIds[i]) ? 'Gassin' : 'Ramatuelle'
      }));

      await supabase.from('live_teams').insert(teamsToInsert);

      // 3. Génération ordonnée des matches
      const pouleMatches: any[] = [];

      /**
       * Nouvelle logique de génération ordonnée
       * Pour Gassin (A,C,E,G), l'ordre sera : 
       * 1: A-C, 2: E-G, 3: A-E, 4: C-G, 5: A-G, 6: C-E
       */
      const generateOrderedMatches = (ids: string[], village: string) => {
        // Définition des paires par index (0=A/B, 1=C/D, 2=E/F, 3=G/H)
        const sequence = [
          [0, 1], // AC ou BD
          [2, 3], // EG ou FH
          [0, 2], // AE ou BF
          [1, 3], // CG ou DH
          [0, 3], // AG ou BH
          [1, 2]  // CE ou DF
        ];

        sequence.forEach(([idx1, idx2]) => {
          pouleMatches.push({
            poule: village,
            type: 'Poule',
            tableau: 'Principal',
            team1_id: ids[idx1],
            team2_id: ids[idx2],
            status: 'EN_ATTENTE'
          });
        });
      };

      // Appel de la génération pour les deux poules
      generateOrderedMatches(['A', 'C', 'E', 'G'], 'Gassin');
      generateOrderedMatches(['B', 'D', 'F', 'H'], 'Ramatuelle');

      // 4. Envoi en base
      await supabase.from('live_matches').insert(pouleMatches);
      await supabase.from('live_tournament').update({ status: 'POULES' }).eq('id', 1);

      alert("🔥 C'est parti ! Le tournoi est en ligne.");
      router.push('/live/poules');
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };



  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-red-600 font-black italic animate-pulse">CHARGEMENT...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 md:mb-12 flex justify-between items-center border-b border-white/10 pb-6 md:pb-8 group">
          <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter group-hover:text-red-600">
            Live <span className="text-red-600 group-hover:text-white">équipe</span>
          </h1>
          <button onClick={() => router.push('/live/poules')} className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
            <ArrowRight size={14} /> <span className="hidden md:inline">poules</span>
		  </button>
        </header>

		<RenderStepper currentStatus = {status} />

        {step === 1 ? (
          /* ÉTAPE 1 : SÉLECTION */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-3 flex justify-center mt-12">
               <button 
                disabled={selectedPointeurs.length !== 8 || selectedTireurs.length !== 8}
                onClick={finalizeSelectionAndSave}
                className="bg-red-600 disabled:bg-zinc-900 disabled:text-zinc-700 px-16 py-6 rounded-3xl font-black uppercase tracking-widest flex items-center gap-4 transition-all hover:scale-105 active:scale-95"
               >
                 Sauvegarder & Équilibrer <ArrowRight />
               </button>
            </div>

             <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 h-[600px] flex flex-col">
              <h2 className="text-center text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-[0.2em]">Base Profiles (Elo)</h2>


              <div className="overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {allProfiles.map(p => {
                  const isP = selectedPointeurs.find(x => x.id === p.id);
                  const isT = selectedTireurs.find(x => x.id === p.id);
                  return (
                    <div key={p.id} className={`p-3 rounded-2xl border transition-all ${isP || isT ? 'opacity-20 bg-black' : 'bg-zinc-900 border-white/5 hover:border-red-600'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[11px] uppercase">{p.nom} <span className="text-zinc-600 ml-2">{p.elo.toFixed(1)} / {p.modern.toFixed(0)}</span></span>
                        <div className="flex gap-1">
                          <button onClick={() => setSelectedPointeurs(prev => [...prev, p])} disabled={!!(isP || isT || selectedPointeurs.length >= 8)} className="bg-blue-600 text-[8px] font-black px-2 py-1 rounded-lg uppercase disabled:hidden">P</button>
                          <button onClick={() => setSelectedTireurs(prev => [...prev, p])} disabled={!!(isP || isT || selectedTireurs.length >= 8)} className="bg-red-600 text-[8px] font-black px-2 py-1 rounded-lg uppercase disabled:hidden">T</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-blue-900/5 border border-blue-500/10 p-6 rounded-[2.5rem]">
              <h2 className="text-blue-500 text-center text-[10px] font-black uppercase mb-4 italic">Pointeurs ({selectedPointeurs.length}/8)</h2>
              <div className="space-y-2">
                {selectedPointeurs.map(p => (
                  <div key={p.id} className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase">{p.nom}</span>
                    <button onClick={() => setSelectedPointeurs(prev => prev.filter(x => x.id !== p.id))} className="text-blue-500 font-black text-xs px-2">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-900/5 border border-red-500/10 p-6 rounded-[2.5rem]">
              <h2 className="text-red-500 text-center text-[10px] font-black uppercase mb-4 italic">Tireurs ({selectedTireurs.length}/8)</h2>
              <div className="space-y-2">
                {selectedTireurs.map(p => (
                  <div key={p.id} className="p-3 bg-red-600/10 border border-red-500/20 rounded-2xl flex justify-between items-center">
                    <span className="text-[11px] font-bold uppercase">{p.nom}</span>
                    <button onClick={() => setSelectedTireurs(prev => prev.filter(x => x.id !== p.id))} className="text-red-500 font-black text-xs px-2">✕</button>
                  </div>
                ))}
              </div>
            </div>

         </div>
        ) : (
          /* ÉTAPE 2 : DRAFT INTERACTIF */
          <div className="space-y-12">
            <div className="flex justify-between items-end">
               <div>
                  <h2 className="text-3xl font-black italic uppercase">Doublettes</h2>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2">Utilise les flèches pour déplacer un joueur et changer son partenaire</p>
               </div>
               <button onClick={handleInitialShuffle} className="bg-zinc-900 hover:bg-zinc-800 p-4 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase transition-colors">
                 <RefreshCw size={14} className="text-red-600"/> Re-mélanger Aléatoirement
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {/* PANNEAU DE CONTRÔLE MANUEL (FLÈCHES) */}
               <div className="grid grid-cols-2 gap-4 bg-zinc-900/30 p-8 rounded-[3rem] border border-white/5">
                  <div className="space-y-2">
                    <p className="text-center text-[10px] font-black text-blue-500 uppercase mb-4 tracking-tighter underline decoration-2 underline-offset-4">Pointeurs</p>
                    {draftP.map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-black rounded-xl border border-white/5">
                        <span className="text-[10px] font-bold uppercase truncate max-w-[80px]">{p.nom}</span>
                        <div className="flex gap-1">
                          <button onClick={() => movePlayer(i, -1, draftP, setDraftP)} className="p-1 hover:text-red-600 transition-colors"><ChevronUp size={16}/></button>
                          <button onClick={() => movePlayer(i, 1, draftP, setDraftP)} className="p-1 hover:text-red-600 transition-colors"><ChevronDown size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-center text-[10px] font-black text-red-500 uppercase mb-4 tracking-tighter underline decoration-2 underline-offset-4">Tireurs</p>
                    {draftT.map((t, i) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-black rounded-xl border border-white/5">
                        <div className="flex gap-1">
                          <button onClick={() => movePlayer(i, -1, draftT, setDraftT)} className="p-1 hover:text-red-600 transition-colors"><ChevronUp size={16}/></button>
                          <button onClick={() => movePlayer(i, 1, draftT, setDraftT)} className="p-1 hover:text-red-600 transition-colors"><ChevronDown size={16}/></button>
                        </div>
                        <span className="text-[10px] font-bold uppercase truncate max-w-[80px]">{t.nom}</span>
                      </div>
                    ))}
                  </div>
               </div>

               {/* RÉCAPITULATIF VISUEL PAR ÉQUIPE / POULE */}
               <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-zinc-600 uppercase text-center mb-4 tracking-[0.3em]">Aperçu des Équipes</h3>
                  {draftP.map((p, i) => {
                    const tId = ['A','B','C','D','E','F','G','H'][i];
                    const isGassin = ['A','C','E','G'].includes(tId);
                    return (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${isGassin ? 'border-blue-900/30 bg-blue-900/5' : 'border-red-900/30 bg-red-900/5'}`}>
                        <span className="font-black italic text-red-600 w-8">#{tId}</span>
                        <div className="flex-1 flex justify-center gap-4 text-[11px] font-black uppercase">
                          <span className="text-white">{p.nom}</span>
                          <span className="text-zinc-700">& {((p.elo+draftT[i].elo)/2).toFixed(1)} &</span>
                          <span className="text-white">{draftT[i].nom}</span>
                        </div>
                        <span className="text-[8px] font-black text-zinc-500 w-16 text-right uppercase tracking-tighter">
                          {isGassin ? 'Gassin' : 'Ramatuelle'}
                        </span>
                      </div>
                    )
                  })}
               </div>
            </div>

            <div className="flex justify-center gap-6 pt-12 border-t border-white/5">
              <button onClick={() => setStep(1)} className="px-8 py-4 text-zinc-500 font-black uppercase text-xs tracking-widest hover:text-white transition-colors">Retour Sélection</button>
              <button 
                onClick={confirmAndCreateTournament}
                className="px-16 py-6 bg-red-600 rounded-3xl font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-2xl shadow-red-600/20 active:scale-95"
              >
                Lancer le Tournoi Officiel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
