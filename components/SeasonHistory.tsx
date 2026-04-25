'use client'

import { useState } from 'react';
import { ChevronDown, ChevronUp, Swords, Trophy, Target } from 'lucide-react';

interface SeasonStat {
  annee: number;
  role: string;
  partenaire: string;
  victoires: number;
  defaites: number;
  nuls: number;
  palmares: string;
  classement: number;
  finale_jouee: string;
  rank_elo_final: number;
  rank_elo_modern_final: number;
  elo?: number; // Optionnel selon ta fusion
}

// On ajoute 'fullHistory' pour avoir le détail des matchs
export default function SeasonHistory({ stats, fullHistory,historyAll }: { stats: SeasonStat[], fullHistory: any[], historyAll: any[] }) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  if (!stats || stats.length === 0) {
    return <div className="p-4 text-gray-500 italic">Aucune donnée historique trouvée.</div>;
  }

//  console.log('coucou',historyAll);

  return (
    <div className="space-y-3">
      {/* HEADER DU "FAUX" TABLEAU */}
      <div className="hidden md:grid grid-cols-12 px-6 py-2 text-[10px] uppercase tracking-widest text-gray-500 font-black">
        <div className="col-span-1">Saison</div>
        <div className="col-span-3">Partenaire & Rôle</div>
        <div className="col-span-2 text-center">V/N/D</div>
        <div className="col-span-3 text-center">Résultat</div>
        <div className="col-span-2 text-right">Rangs (C/M)</div>
        <div className="col-span-1"></div>
      </div>

      {/* LISTE DES SAISONS */}
      {stats.map((s, i) => {
        const isExpanded = expandedYear === s.annee;
        
        // On filtre les matchs du joueur pour cette année précise
        const yearlyMatches = fullHistory
          .filter(h => h.year === s.annee)
          .sort((a, b) => a.game_id - b.game_id);

        return (
          <div key={i} className={`group border transition-all duration-200 ${
            isExpanded ? 'bg-gray-900/50 border-red-600/50 shadow-lg' : 'bg-gray-900 border-gray-800 hover:border-gray-700'
          } rounded-xl overflow-hidden`}>
            
            {/* LIGNE PRINCIPALE */}
			<div 
			  onClick={() => setExpandedYear(isExpanded ? null : s.annee)}
			  className="grid grid-cols-12 items-center p-4 md:px-6 cursor-pointer gap-2"
			>
			  {/* Saison & Rôle */}
			  <div className="col-span-3 md:col-span-1 flex flex-col">
			    <span className="text-base md:text-lg font-black italic text-white">{s.annee}</span>
			    <span className={`text-[9px] font-black uppercase tracking-tighter ${
			      s.role === 'Tireur' ? 'text-orange-400' : 'text-purple-400'
			    }`}>{s.role}</span>
			  </div>

			  {/* Partenaire */}
			  <div className="col-span-5 md:col-span-3 text-sm md:text-xl font-black italic text-white truncate">
			    {s.partenaire}
			  </div>

			  {/* Reste des infos... (Cache le V/N/D sur mobile pour gagner de la place) */}
			  <div className="hidden md:block col-span-2 text-center font-mono font-bold text-gray-400">
			    {s.victoires}/{s.nuls}/{s.defaites}
			  </div>

			  {/* Résultats & Rangs (Réduis la largeur col-span sur mobile) */}
			  <div className="col-span-3 md:col-span-3 text-center">
			    <span className="text-[9px] text-gray-500 font-black uppercase block">{s.finale_jouee}</span>
			    <span className="text-[10px] md:text-xs font-bold text-red-600 whitespace-nowrap">
			      {s.palmares === '-' ? `#${s.classement}` : s.palmares}
			    </span>
			  </div>

			  <div className="hidden md:block col-span-2 text-right">
			    {/* ... ton badge ELO ... */}
			  </div>

			  <div className="col-span-1 text-right">
			    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
			  </div>
			</div>

            {/* NIVEAU 2 : DÉTAILS DES MATCHS (ACCORDÉON) */}
            {isExpanded && (
              <div className="bg-black/40 border-t border-gray-800 p-4 md:p-6 space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-600 mb-4 flex items-center gap-2">
                  <Swords size={12} /> Détail des rencontres tournois {s.annee}
                </h4>
                
                <div className="space-y-1">
                  {yearlyMatches.map((m, idx) => (
					<div key={idx} className="flex flex-col md:grid md:grid-cols-12 gap-3 items-center py-3 px-4 bg-gray-900/30 rounded-lg border border-white/5 hover:bg-white/5 transition-colors">
					  
					  {/* BLOC GAUCHE : TYPE & SCORE (Toujours alignés horizontalement) */}
					  <div className="flex items-center justify-between w-full md:col-span-3">

						<div className="col-span-3 md:col-span-2 flex flex-col justify-center gap-1">
						  {/* Ligne 1 : Le Badge (Type) */}
						  <div className="flex">
						    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none ${
						      m.type === 'Finale' ? 'bg-yellow-500 text-black' : 'bg-gray-800 text-gray-400'
						    }`}>
						      {m.type?.toUpperCase() || 'POULE'}
						    </span>
						  </div>

						  {/* Ligne 2 : Le Nom de la poule (si il existe) */}
						  {m.poule && (
						    <span className="text-[10px] font-bold text-gray-500 italic leading-tight truncate">
						      {m.poule}
						    </span>
						  )}
						</div>

					    {/* RÉSULTAT & SCORE */}    
					    <div className="flex items-center gap-2 md:ml-auto">
					      <div className={`w-2 h-2 rounded-full ${m.win > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
					      <span className="font-mono text-lg font-black text-white">
					        {m.sc_p} <span className="text-gray-600 text-sm">-</span> {m.sc_c}
					      </span>
					    </div>
					  </div>
					  {/* Les Adversaires */}
					  <div className="flex justify-between w-full md:col-span-4 border-t border-white/5 pt-2 md:border-0 md:pt-0">
					    <div className="flex flex-col">
					      <span className="text-[11px] font-mono text-orange-400 truncate max-w-[120px]">T: {m.tireur}</span>
					      <span className="text-[11px] font-mono text-purple-400 truncate max-w-[120px]">P: {m.pointeur}</span>
					    </div>
					    
					    {/* ELO : On le montre aussi sur mobile à côté des adversaires */}
					    <div className="flex flex-col text-right md:hidden">
					        <span className="text-[9px] text-gray-600 uppercase font-black font-mono">ELO {m.elo_value.toFixed(0)}</span>
					        <span className="text-[9px] text-purple-600 uppercase font-black font-mono">MOD {m.elo_modern_value.toFixed(0)}</span>
					    </div>
					  </div>
					{/* BLOC DROITE : ELO & RANG (Caché sur mobile ou réorganisé) */}
					  <div className="hidden md:flex col-span-3 gap-6 justify-center">
					    <div className="text-center">
					      <p className="text-[8px] text-gray-600 font-black uppercase">ELO</p>
					      <p className="text-sm font-mono font-bold text-red-600">{m.elo_value.toFixed(1)}</p>
					    </div>
					    <div className="text-center">
					      <p className="text-[8px] text-gray-600 font-black uppercase">Moderne</p>
					      <p className="text-sm font-mono font-bold text-purple-400">{m.elo_modern_value.toFixed(1)}</p>
					    </div>
					  </div>

					  <div className="flex justify-between items-center w-full md:w-auto md:col-span-2 md:text-right border-t border-white/5 pt-2 md:border-0 md:pt-0">
					    <span className="text-[8px] text-gray-600 font-black uppercase md:hidden">Rang Final</span>
					    <span className="text-xs font-black italic text-gray-400">#{m.rank_at_time} <span className="md:hidden">Global</span></span>
					  </div>


                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
/*
import { createClient } from '@/utils/supabase/server'

interface SeasonStat {
  id: number;
  nom: string;
  annee: number;
  role: string;
  partenaire: string;
  pour: number;
  contre: number;
  goalavg: number;
  classement: number;
  victoires: number;
  defaites: number;
  nuls: number;
  palmares: string;
  finale_jouee: string;
  rang: number;
  rank_elo_final: number;
  rank_elo_modern_final: number;
}

// Mise à jour de l'interface des Props
export default function SeasonHistory({ stats }: { stats: SeasonStat[] }) {
  //console.log("Stats reçues par le composant :", stats);
  // Vérification de sécurité
  if (!stats || stats.length === 0) {
    return <div className="p-4 text-gray-500 italic">Aucune donnée historique trouvée.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-gray-300">
        <thead>
          <tr className="border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500">
            <th className="p-4">Saison</th>
            <th className="p-4">Partenaire</th>
            <th className="p-4">Rôle</th>
            <th className="p-4 text-center">V/N/D</th>
            <th className="p-4 text-center">Place</th>
            <th className="p-4 text-right">Rang</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {stats.map((s, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              <td className="p-4 font-bold text-white">{s.annee}</td>
              <td className="p-4">{s.partenaire}</td>
              <td className="p-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  s.role === 'Tireur' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {s.role}
                </span>
              </td>
              <td className="p-4 text-center font-mono">
                {s.victoires}/{s.nuls}/{s.defaites}
              </td>
              <td className="p-4 text-center">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-bold">{s.finale_jouee}</span>
                  <span className="text-[14px] text-gray-300 font-bold">{s.palmares=='-'?'#'+s.classement:s.palmares}</span>
                </div>
              </td>
              <td className="p-4 text-right">
                <span className="bg-gray-800 px-2 py-1 rounded text-xs font-mono text-blue-400">
                  {s.rank_elo_final}/{s.rank_elo_modern_final}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

*/
