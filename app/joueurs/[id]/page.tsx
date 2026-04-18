import { createClient } from '@/utils/supabase/server';
import EloChart from '@/components/EloChart'; 
import StatsCard from '@/components/StatsCard';
import SeasonHistory from '@/components/SeasonHistory';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function PlayerProfile({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. On attend la résolution des paramètres d'URL (Indispensable Next.js 16)
  const { id } = await params; 
  
  // 2. On attend la création du client Supabase (Règle l'erreur TypeError)
  const supabase = await createClient();

  // On transforme l'ID en nombre pour la requête SQL
  const playerId = parseInt(id, 10);

  const { data: player, error } = await supabase
    .from('profiles')
    .select(`
      *,
      elo_history!fk_elo_player (
        elo_value,
        elo_modern_value,
        year
      )
    `)
    .eq('id', playerId)
    .single();

  // Gestion d'erreur si le joueur n'existe pas
  if (error || !player) {
    console.error("Détails erreur:", error);
    return (
      <div className="p-20 text-center bg-gray-950 min-h-screen text-white">
        <h1 className="text-2xl font-bold">Joueur introuvable</h1>
        <p className="text-gray-400 mt-2">ID recherché : {id}</p>
        <Link href="/classement" className="inline-block mt-4 text-blue-400 hover:underline italic">
          ← Retour au classement
        </Link>
      </div>
    );
  }

  // 3. Logique de calcul du score actuel
  // On trie l'historique par année pour être sûr que le dernier élément est le plus récent
  const sortedHistory = [...(player.elo_history || [])].sort((a, b) => a.year - b.year);
  const totalMatchs = sortedHistory.length;
  const currentEloPst = totalMatchs > 0 ? sortedHistory[totalMatchs - 1].elo_value : 100;

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* LIEN DE RETOUR */}
        <Link href="/classement" className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="text-sm font-bold uppercase tracking-widest">Retour au classement</span>
        </Link>

        {/* --- SECTION 1 : EN-TÊTE & PALMARÈS --- */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">{player.nom}</h1>
              <span className="bg-gray-800 px-2 py-1 rounded text-gray-500 text-xs font-mono border border-gray-700">ID:{player.id}</span>
            </div>
            <p className="text-blue-400 font-bold mt-1 uppercase tracking-widest text-xs">PST Elite Member</p>
          </div>

          <div className="flex gap-4">
             {/* Zone Trophées */}
             <div className="bg-black/40 p-4 rounded-xl border border-yellow-600/20 text-center min-w-[100px]">
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Palmarès</p>
               <p className="text-2xl">🏆 🏆</p> 
             </div>
             
             {/* Zone ELO Actuel */}
             <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-600/30 text-center min-w-[140px]">
               <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-1">ELO ACTUEL</p>
               <p className="text-3xl font-mono font-black text-white">
                 {typeof currentEloPst === 'number' ? currentEloPst.toFixed(1) : currentEloPst}
               </p>
             </div>
          </div>
        </div>

        {/* --- SECTION 2 : GRAPHIQUE D'ÉVOLUTION --- */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Analyse de Progression</h2>
            <div className="text-[10px] text-gray-500 font-bold px-3 py-1 bg-black/30 rounded-full border border-gray-800 uppercase tracking-widest">
              Données Historiques
            </div>
          </div>
          <div className="h-[350px] w-full">
             <EloChart history={sortedHistory} />
          </div>
        </div>

        {/* --- SECTION 3 : STATS GLOBALES --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label="Matchs" value={totalMatchs} color="gray" />
          <StatsCard label="Gagnés" value="--" color="green" /> 
          <StatsCard label="Tireur 🔫" value="--" color="orange" />
          <StatsCard label="Pointeur 🪩" value="--" color="purple" />
        </div>

        {/* --- SECTION 4 : HISTORIQUE DES SAISONS --- */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-xl">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-6">Parcours détaillé</h2>
          <SeasonHistory playerId={player.id} />
        </div>

      </div>
    </div>
  );
}
