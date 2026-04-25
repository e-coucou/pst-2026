import { createClient } from '@/utils/supabase/server';
import { Trophy, Target, Swords, Users, ChevronLeft, Star, Medal } from 'lucide-react';
import Link from 'next/link';

export default async function TournamentDetailPage({ 
  params 
}: { 
  params: Promise<{ year: string }> 
}) {
  const supabase = await createClient();
  const { year } = await params;

  const { data: matches } = await supabase
    .from('games')
    .select(`
      id, poule, type, tableau, score_1, score_2,
      team_1:team_1_id ( nom, tireur:profiles!fk_teams_tireur(nom), pointeur:profiles!fk_teams_pointeur(nom) ),
      team_2:team_2_id ( nom, tireur:profiles!fk_teams_tireur(nom), pointeur:profiles!fk_teams_pointeur(nom) )
    `)
    .eq('year', year)
    .order('id', { ascending: true });

  // 1. BLOC FINALES (Filtrage précis)
  const laFinale = matches?.find(m => m.type?.toLowerCase() === 'finale' && m.tableau?.toLowerCase() === 'principal');
  const autresFinales = matches?.filter(m => 
    ['petite finale', 'toute petite finale', "finale d'honneur"].includes(m.type?.toLowerCase() || '')
  ) || [];

  // 2. BLOC DEMIS
  const demis = matches?.filter(m => m.type?.toLowerCase() === 'demi') || [];

  // 3. BLOC POULES
  const gassin = matches?.filter(m => m.poule?.toLowerCase() === 'gassin') || [];
  const ramatuelle = matches?.filter(m => m.poule?.toLowerCase() === 'ramatuelle') || [];

// Fonction pour calculer le classement d'une poule
const calculerClassement = (matchs: any[]) => {
  const stats: Record<string, { nom: string, tireur: string, pointeur: string, v: number, d: number, plus: number, moins: number, diffuse: number }> = {};

  matchs.forEach(m => {
    [ {t: m.team_1, s: m.score_1, oppS: m.score_2, ti:m.team_1.tireur.nom, po:m.team_1.pointeur.nom}, 
      {t: m.team_2, s: m.score_2, oppS: m.score_1, ti:m.team_2.tireur.nom, po:m.team_2.pointeur.nom} ].forEach(({t, s, oppS, ti, po}) => {
      if (!t) return;
      if (!stats[t.nom]) stats[t.nom] = { nom: t.nom, tireur:'', pointeur:'', v: 0, d: 0, plus: 0, moins: 0, diffuse: 0 };
      
      const isWinner = s > oppS;
      stats[t.nom].tireur = ti;
      stats[t.nom].pointeur = po;
      stats[t.nom].v += isWinner ? 1 : 0;
      stats[t.nom].d += isWinner ? 0 : 1;
      stats[t.nom].plus += s || 0;
      stats[t.nom].moins += oppS || 0;
      stats[t.nom].diffuse = stats[t.nom].plus - stats[t.nom].moins;
    });
  });

  return Object.values(stats).sort((a, b) => b.v - a.v || b.diffuse - a.diffuse);
};

const classementGassin = calculerClassement(gassin);
const classementRamatuelle = calculerClassement(ramatuelle);

{/* Affichage ... */}
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-screen bg-black text-white">
      
      {/* HEADER COMPACT */}
      <div className="flex justify-between items-end mb-12 border-b border-red-900/30 pb-6">
        <div>
          <h1 className="text-7xl font-black italic uppercase leading-none tracking-tighter">
            Édition <span className="text-red-600">{year}</span>
          </h1>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Compétition Officielle</p>
          <p className="text-sm font-bold italic">Pétanque Paris Saint-Tropez</p>
        </div>
      </div>

      {/* --- BLOC 1 : LES FINALES --- */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="text-red-600" size={28} />
          <h2 className="text-3xl font-black uppercase italic tracking-tight"><span className="text-white">Les</span><span className="text-red-600"> Finales</span></h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* MISE EN VALEUR : LA GRANDE FINALE */}
          {laFinale && (
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative bg-zinc-900 border-2 border-red-600 rounded-2xl p-8 shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-6 py-1 rounded-full text-xs font-black uppercase tracking-[0.3em] shadow-lg">
                  LA FINALE
                </div>
                <MatchRow match={laFinale} size="lg" />
              </div>
            </div>
          )}

			{/* --- LES 3 AUTRES FINALES (STYLE CADRE & HALO ROUGE) --- */}
			<div className="grid md:grid-cols-3 gap-6">
			  {autresFinales.map((m) => (
			    <div key={m.id} className="relative group">
			      {/* Effet Halo Rouge plus subtil */}
			      <div className="absolute -inset-0.5 bg-red-600/10 rounded-2xl blur-sm opacity-40 group-hover:opacity-80 transition-opacity"></div>
			      
			      <div className="relative bg-zinc-900/60 border-2 border-red-900/20 rounded-2xl overflow-hidden hover:border-red-900/40 transition-colors">
			        {/* En-tête de la Finale spécifique */}
			        <div className="bg-red-950/20 px-4 py-2 border-b border-red-900/20 flex justify-center items-center">
			          <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">
			            {m.type}
			          </span>
			        </div>

			        {/* Contenu du Match - On utilise MatchRow avec une taille sm ou md selon ton envie */}
			        <div className="p-5">
			           <MatchRow match={m} size="sm" />
			        </div>
			        
			        {/* Petit rappel du tableau en bas */}
			        <div className="px-4 py-1.5 bg-black/40 text-center">
			           <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">
			             Tableau {m.tableau}
			           </span>
			        </div>
			      </div>
			    </div>
			  ))}
			</div>

         
        </div>
      </section>

		{/* --- BLOC 2 : LES DEMIS (STYLE CADRE & HALO) --- */}
		<section className="mb-20">
		  <div className="flex items-center gap-3 mb-8">
		    <div className="bg-zinc-800 p-2 rounded-lg">
		      <Medal className="text-gray-400" size={24} />
		    </div>
		    <h2 className="text-3xl font-black uppercase italic tracking-tight text-white"><span className="text-white">Les</span><span className="text-red-600"> Demis</span></h2>
		    <div className="flex-1 h-px bg-gradient-to-r from-zinc-700 to-transparent ml-4" />
		  </div>

		  <div className="grid md:grid-cols-2 gap-8">
		    {demis.map((m) => (
		      <div key={m.id} className="relative group">
		        {/* Effet Halo Argenté/Gris */}
		        <div className="absolute -inset-0.5 bg-zinc-600/20 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
		        
		        <div className="relative bg-zinc-900/60 border-2 border-zinc-700/50 rounded-2xl overflow-hidden">
		          {/* Header du match (Tableau) */}
		          <div className="bg-zinc-800/80 px-4 py-2 border-b border-zinc-700/50 flex justify-between items-center">
		            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
		              Tableau {m.tableau}
		            </span>
		            <span className="text-[9px] font-bold bg-zinc-700 px-2 py-0.5 rounded text-white/70 uppercase">
		              Match Eliminatoire
		            </span>
		          </div>

		          {/* Contenu du Match */}
		          <div className="p-6">
		             <MatchRow match={m} size="md" />
		          </div>
		        </div>
		      </div>
		    ))}
		  </div>
		</section>

		{/* --- BLOC CLASSEMENT DES POULES --- */}
		<section className="mb-20">
		  <div className="flex items-center gap-3 mb-8">
		    <Users className="text-red-600" size={24} />
		    <h2 className="text-2xl font-black uppercase italic tracking-tight text-white"><span className="text-white">Classement</span><span className="text-red-600"> des Poules</span></h2>
		  </div>

		  <div className="grid lg:grid-cols-2 gap-8">
		    {[
		      { nom: "Gassin", data: classementGassin, color: "text-orange-500" },
		      { nom: "Ramatuelle", data: classementRamatuelle, color: "text-purple-500" }
		    ].map((poule) => (
		      <div key={poule.nom} className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden">
		        <div className="bg-zinc-800/50 px-4 py-2 border-b border-white/5 flex justify-between items-center">
		          <span className={`font-black uppercase italic text-sm ${poule.color}`}>{poule.nom}</span>
		          <span className="text-[10px] text-gray-500 font-bold uppercase">Stats Globales</span>
		        </div>
		        <table className="w-full text-left border-collapse">
		          <thead>
		            <tr className="text-[10px] text-gray-500 uppercase font-black border-b border-white/5">
		              <th className="px-4 py-3">Clt</th>
		              <th className="px-4 py-3">Équipe</th>
		              <th className="px-2 py-3 text-center">V</th>
		              <th className="px-2 py-3 text-center">D</th>
		              <th className="px-2 py-3 text-center">+/-</th>
		              <th className="px-4 py-3 text-center text-red-500">Diff.</th>
		            </tr>
		          </thead>
		          <tbody className="divide-y divide-white/5">
		            {poule.data.map((team, idx) => (
		              <tr key={team.nom} className={`hover:bg-white/5 transition-colors ${idx < 2 ? 'bg-red-600/5' : ''}`}>
		                <td className="px-4 py-3">
		                  <div className="flex items-center gap-3">
		                    <span className={`text-xs font-black ${idx < 2 ? 'text-red-600' : 'text-gray-600'}`}>{idx + 1}</span>
		                    <span className="text-sm font-bold uppercase italic tracking-tight">{team.nom}</span>
		                  </div>
		                </td>
		                <td>
					        <div className={`flex flex-col text-base md:text-base font-bold`}>
					          <span className="text-red-500 uppercase">{team.tireur}</span>
					          <span className="text-white uppercase leading-none">{team.pointeur}</span>
					        </div>
		                </td>
		                <td className="px-2 py-3 text-center font-mono text-xs">{team.v}</td>
		                <td className="px-2 py-3 text-center font-mono text-xs text-gray-500">{team.d}</td>
		                <td className="px-2 py-3 text-center font-mono text-[10px] text-gray-400">{team.plus}/{team.moins}</td>
		                <td className={`px-4 py-3 text-center font-mono font-black text-xs ${team.diffuse > 0 ? 'text-green-500' : team.diffuse < 0 ? 'text-red-500' : 'text-gray-500'}`}>
		                  {team.diffuse > 0 ? `+${team.diffuse}` : team.diffuse}
		                </td>
		              </tr>
		            ))}
		          </tbody>
		        </table>
		      </div>
		    ))}
		  </div>
		</section>


		{/* --- BLOC 3 : LES POULES AVEC CADRES DE COULEURS --- */}
		<div className="grid lg:grid-cols-2 gap-10 mt-12">
		  
		  {/* POULE GASSIN (ORANGE) */}
		  <section className="relative group">
		    {/* Effet de lueur en arrière-plan */}
		    <div className="absolute -inset-1 bg-orange-600/20 rounded-2xl blur-sm opacity-50"></div>
		    
		    <div className="relative bg-zinc-900/40 border-2 border-orange-600/50 rounded-2xl overflow-hidden">
		      <div className="bg-orange-600/10 px-5 py-4 border-b border-orange-600/30 flex items-center justify-between">
		        <h3 className="text-2xl font-black uppercase italic text-orange-500 flex items-center gap-3">
		          <Target size={24} />Gassin
		        </h3>
		        <span className="text-[10px] font-black bg-orange-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter">
		          6 Matchs
		        </span>
		      </div>
		      
		      <div className="p-4 space-y-3">
		        {gassin.map(m => (
		          <div key={m.id} className="bg-black/40 border border-orange-600/10 p-3 rounded-xl hover:border-orange-600/40 transition-colors">
		            <MatchRow match={m} size="xs" />
		          </div>
		        ))}
		      </div>
		    </div>
		  </section>

		  {/* POULE RAMATUELLE (PURPLE) */}
		  <section className="relative group">
		    {/* Effet de lueur en arrière-plan */}
		    <div className="absolute -inset-1 bg-purple-600/20 rounded-2xl blur-sm opacity-50"></div>
		    
		    <div className="relative bg-zinc-900/40 border-2 border-purple-600/50 rounded-2xl overflow-hidden">
		      <div className="bg-purple-600/10 px-5 py-4 border-b border-purple-600/30 flex items-center justify-between">
		        <h3 className="text-2xl font-black uppercase italic text-purple-500 flex items-center gap-3">
		          <Target size={24} />Ramatuelle
		        </h3>
		        <span className="text-[10px] font-black bg-purple-600 text-white px-3 py-1 rounded-full uppercase tracking-tighter">
		          6 Matchs
		        </span>
		      </div>
		      
		      <div className="p-4 space-y-3">
		        {ramatuelle.map(m => (
		          <div key={m.id} className="bg-black/40 border border-purple-600/10 p-3 rounded-xl hover:border-purple-600/40 transition-colors">
		            <MatchRow match={m} size="xs" />
		          </div>
		        ))}
		      </div>
		    </div>
		  </section>
		</div>

		
    </div>
  );
}

// COMPOSANT LIGNE DE MATCH FLEXIBLE
function MatchRow({ match, size = 'md' }: { match: any, size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const isLarge = size === 'lg';
  const isSmall = size === 'xs' || size === 'sm';

  return (
    <div className="flex justify-between items-center gap-2 md:gap-4">
      {/* TEAM 1 */}
      <div className="flex-1 text-center">
        <p className={`${isLarge ? 'text-sm md:text-3xl' : 'text-xs md:text-sm'} font-black uppercase italic leading-none mb-1`}>{match.team_1?.nom}</p>
        <div className={`flex flex-col ${isLarge ? 'text-[16px] md:text-4xl' : 'text-[12px] md:text-[11px]'} font-bold`}>
          <span className="text-red-500 uppercase">{match.team_1?.tireur?.nom}</span>
          <span className="text-white uppercase leading-none">{match.team_1?.pointeur?.nom}</span>
        </div>
      </div>

      {/* SCORE COMPACT */}
      <div className={`flex items-center justify-center font-mono font-black italic bg-black rounded-lg border border-red-600/20 ${isLarge 
                ? 'text-xl px-3 py-1 md:text-4xl md:px-6 md:py-2' 
                : 'text-lg px-8 py-0.5 md:text-xl md:px-3 md:py-1'}`}>
        {match.score_1}<span className="text-red-600 mx-1">-</span>{match.score_2}
      </div>

      {/* TEAM 2 */}
      <div className="flex-1 text-center">
        <p className={`${isLarge ? 'text-sm md:text-3xl' : 'text-xs md:text-sm'} font-black uppercase italic leading-none mb-1`}>{match.team_2?.nom}</p>
        <div className={`flex flex-col ${isLarge ? 'text-[16px] md:text-4xl' : 'text-[12px] md:text-[11px]'} font-bold`}>
          <span className="text-red-500 uppercase">{match.team_2?.tireur?.nom}</span>
          <span className="text-white uppercase leading-none">{match.team_2?.pointeur?.nom}</span>
        </div>
      </div>
    </div>
  );
}
