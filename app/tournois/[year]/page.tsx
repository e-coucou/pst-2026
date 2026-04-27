import { createClient } from '@/utils/supabase/server';
import { Trophy, Target, Swords, Users, ChevronLeft, Star, Medal, Zap } from 'lucide-react';
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
      team_1:team_1_id ( id, nom, tireur:profiles!fk_teams_tireur(nom, photo_url), pointeur:profiles!fk_teams_pointeur(nom, photo_url) ),
      team_2:team_2_id ( id, nom, tireur:profiles!fk_teams_tireur(nom, photo_url), pointeur:profiles!fk_teams_pointeur(nom, photo_url) )
    `)
    .eq('year', year)
    .order('id', { ascending: true });

  // Récupération des photos signées
  const profilesRes = await supabase.from('profiles').select('id, photo_url');
  const profiles = profilesRes.data || [];
  const filePaths = profiles.map(p => p.photo_url).filter((path): path is string => Boolean(path));

  let signedUrls: Record<string, string> = {};
  if (filePaths.length > 0) {
    const { data } = await supabase.storage
      .from('joueurs_photos')
      .createSignedUrls(filePaths, 3600);
    data?.forEach(item => {
      if (item.path && item.signedUrl) signedUrls[item.path] = item.signedUrl;
    });
  }

  // 1. CALCULS DES VAINQUEURS ET STATS
  const laFinale = matches?.find(m => m.type?.toLowerCase() === 'finale' && m.tableau?.toLowerCase() === 'principal');
  let winnerTeam: any = null;
  let winnerStats = { plus: 0, moins: 0, v: 0, d: 0 };

  if (laFinale) {
    const isTeam1Winner = (laFinale.score_1 ?? 0) > (laFinale.score_2 ?? 0);
    winnerTeam = isTeam1Winner ? laFinale.team_1 : laFinale.team_2;

 // Remplace ton bloc de calcul des stats par celui-ci
 matches?.forEach(m => {
   // On récupère proprement les objets team (Supabase renvoie parfois un array)
   const t1 = Array.isArray(m.team_1) ? m.team_1[0] : m.team_1;
   const t2 = Array.isArray(m.team_2) ? m.team_2[0] : m.team_2;
   const wId = winnerTeam?.id;
 
   if (t1?.id === wId) {
     winnerStats.plus += m.score_1 || 0;
     winnerStats.moins += m.score_2 || 0;
     (m.score_1 > m.score_2) ? winnerStats.v++ : winnerStats.d++;
   } else if (t2?.id === wId) {
     winnerStats.plus += m.score_2 || 0;
     winnerStats.moins += m.score_1 || 0;
     (m.score_2 > m.score_1) ? winnerStats.v++ : winnerStats.d++;
   }
 });
  }

  const autresFinales = matches?.filter(m => 
    ['petite finale', 'toute petite finale', "finale d'honneur"].includes(m.type?.toLowerCase() || '')
  ) || [];

  const demis = matches?.filter(m => m.type?.toLowerCase() === 'demi') || [];
  const gassin = matches?.filter(m => m.poule?.toLowerCase() === 'gassin') || [];
  const ramatuelle = matches?.filter(m => m.poule?.toLowerCase() === 'ramatuelle') || [];

  const calculerClassement = (matchs: any[]) => {
    const stats: Record<string, any> = {};
    matchs.forEach(m => {
      [{t: m.team_1, s: m.score_1, oppS: m.score_2}, {t: m.team_2, s: m.score_2, oppS: m.score_1}].forEach(({t, s, oppS}) => {
        if (!t) return;
        if (!stats[t.nom]) stats[t.nom] = { nom: t.nom, tireur: t.tireur.nom, pointeur: t.pointeur.nom, v: 0, d: 0, plus: 0, moins: 0, diffuse: 0 };
        const isWinner = s > oppS;
        stats[t.nom].v += isWinner ? 1 : 0;
        stats[t.nom].d += isWinner ? 0 : 1;
        stats[t.nom].plus += s || 0;
        stats[t.nom].moins += oppS || 0;
        stats[t.nom].diffuse = stats[t.nom].plus - stats[t.nom].moins;
      });
    });
    return Object.values(stats).sort((a: any, b: any) => b.v - a.v || b.diffuse - a.diffuse);
  };

  const classementGassin = calculerClassement(gassin);
  const classementRamatuelle = calculerClassement(ramatuelle);

  // Récupérer les "steps" pour les rangs (Finale = 1, Petite Finale = 3, etc.)
  const { data: steps } = await supabase.from('steps').select('id, value');
  const stepValues = Object.fromEntries(steps?.map(s => [s.id, s.value]) || []);
  const rankedTeams: any[] = [];
  matches?.filter(m => m.type?.toLowerCase().includes('inale')).forEach(m => {
    const baseRank = stepValues[m.type];
    if (baseRank) {
      const isTeam1Winner = (m.score_1 ?? 0) > (m.score_2 ?? 0);
      // Équipe 1
      rankedTeams.push({
        rank: isTeam1Winner ? baseRank : baseRank + 1,
        team: m.team_1,
        type: m.type
      });
      // Équipe 2
      rankedTeams.push({
        rank: isTeam1Winner ? baseRank + 1 : baseRank,
        team: m.team_2,
        type: m.type
      });
    }
  });

// 4. Nettoyage : On enlève le #1 et on trie
const finalTop8 = rankedTeams
  .filter(t => t.team && t.rank > 1) // On vérifie que l'équipe existe et que rank > 1
  .sort((a, b) => a.rank - b.rank);


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
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Compétition Officielle de Pétanque</p>
          <p className="text-sm font-bold italic">Résidence Paris Saint-Tropez</p>
        </div>
      </div>

      {/* --- BLOC 1 : LES VAINQUEURS --- */}
      {winnerTeam && (
        <section className="mb-20 relative">
          <div className="absolute -left-4 top-0 bottom-0 w-1 bg-red-600 hidden md:block" />
          <div className="flex items-center gap-3 mb-10">
            <Star className="text-red-600 fill-red-600" size={32} />
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Les <span className="text-red-600">Vainqueurs</span></h2>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative group">
            <div className="absolute right-0 top-0 text-white/20 font-black text-[15rem] italic leading-none pointer-events-none select-none">#1</div>
            <div className="flex flex-col lg:flex-row gap-12 items-center relative z-10">
              <div className="relative w-64 h-64 shrink-0 mt-4 md:mt-0">
                <div className="absolute top-0 left-0 w-36 h-44 border-2 border-red-600/30 rounded-2xl overflow-hidden rotate-[-12deg] z-10 bg-zinc-800 shadow-xl">
                  <img src={signedUrls[winnerTeam.tireur.photo_url] || "/placeholder-user.jpg"} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-orange-600/90 py-1 text-center text-[10px] font-black uppercase tracking-widest">Tireur</div>
                </div>
                <div className="absolute bottom-0 right-4 w-36 h-44 border-2 border-red-600 rounded-2xl overflow-hidden rotate-[8deg] z-20 bg-zinc-800 shadow-2xl">
                  <img src={signedUrls[winnerTeam.pointeur.photo_url] || "/placeholder-user.jpg"} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-purple-600/90 py-1 text-center text-[10px] font-black uppercase tracking-widest">Pointeur</div>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="mb-8">
                  <p className="text-red-600 font-black italic uppercase text-2xl mb-1 tracking-tighter">Champions Officiels {year}</p>
                  <h3 className="text-5xl md:text-7xl font-black uppercase italic leading-tight tracking-tighter text-purple-600">{winnerTeam.pointeur.nom} <br/><span className="text-white">&</span><span className="text-orange-600"> {winnerTeam.tireur.nom}</span></h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl"><p className="text-[10px] font-black text-gray-500 uppercase mb-2 flex items-center gap-2"><Zap size={12} className="text-red-600"/> Points +</p><p className="text-3xl font-black italic">{winnerStats.plus}</p></div>
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl"><p className="text-[10px] font-black text-gray-500 uppercase mb-2 flex items-center gap-2"><Target size={12} className="text-red-600"/> Points -</p><p className="text-3xl font-black italic">{winnerStats.moins}</p></div>
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-green-500"><p className="text-[10px] font-black text-gray-500 uppercase mb-2">V</p><p className="text-3xl font-black italic">{winnerStats.v}</p></div>
                  <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-red-500"><p className="text-[10px] font-black text-gray-500 uppercase mb-2">D</p><p className="text-3xl font-black italic">{winnerStats.d}</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      {/* --- LE CLASSEMENT --*/}
		<section className="mb-20">
		  <div className="flex items-center gap-3 mb-8">
		    <div className="bg-zinc-800 p-2 rounded-lg">
		      <Trophy className="text-red-600" size={20} />
		    </div>
		    <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">
		      Classement <span className="text-red-600">Final</span>
		    </h2>
		    <div className="flex-1 h-px bg-gradient-to-r from-zinc-800 to-transparent ml-4" />
		  </div>

		  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
		    {finalTop8.map((item, idx) => (
		      <div 
		        key={idx} 
		        className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 ${
		          item.rank === 2 
		            ? 'bg-zinc-100/5 border-zinc-400/30 ring-1 ring-zinc-400/20' 
		            : 'bg-zinc-900/40 border-white/5 hover:border-zinc-700'
		        }`}
		      >
		        <div className="flex justify-between items-start mb-3">
		          <div className={`text-xl font-black italic ${item.rank === 2 ? 'text-zinc-300' : 'text-zinc-600'}`}>
		            #{item.rank}
		          </div>
		          <span className="text-[8px] font-black bg-black/50 px-2 py-1 rounded text-zinc-500 uppercase tracking-widest">
		            {item.type}
		          </span>
		        </div>

		        <div className="flex justify-between space-y-1">
		          <span className="text-purple-600 font-black uppercase text-xs truncate items-start">
		            {item.team?.pointeur?.nom}
		          </span>
		          <span className="text-orange-600 font-bold uppercase text-xs leading-none truncate items-end">
		            {item.team?.tireur?.nom}
		          </span>
		        </div>

		        {/* Photo miniature si c'est le dauphin (#2) */}
		        { item.team?.pointeur?.photo_url && (
		          <div className="flex justify-between mt-3 w-full h-20 rounded-lg overflow-hidden grayscale opacity-50 border border-white/5">
		            <img 
		              src={signedUrls[item.team.pointeur.photo_url]} 
		              className="w-full h-full object-cover"
		              alt="Finaliste"
		            />
		            <img 
		              src={signedUrls[item.team.tireur.photo_url]} 
		              className="w-full h-full object-cover items-end"
		              alt="Finaliste"
		            />

		          </div>
		        )}
		      </div>
		    ))}
		  </div>
		</section>

      {/* --- FINALES --- */}
      <section className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="text-red-600" size={28} />
          <h2 className="text-3xl font-black uppercase italic tracking-tight">Les <span className="text-red-600">Finales</span></h2>
        </div>
        <div className="grid grid-cols-1 gap-6 mb-10">
          {laFinale && (
            <div className="relative group bg-zinc-900 border-2 border-red-600 rounded-2xl p-8 shadow-2xl">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-6 py-1 rounded-full text-xs font-black uppercase tracking-[0.3em]">LA FINALE</div>
               <MatchRow match={laFinale} size="lg" />
            </div>
          )}
		<div className="grid md:grid-cols-3 gap-6">
		  {autresFinales.map((m) => (
		    <div key={m.id} className="relative group">
		      {/* Effet Halo Rouge */}
		      <div className="absolute -inset-0.5 bg-red-600/10 rounded-2xl blur-sm opacity-40 group-hover:opacity-80 transition-opacity"></div>
		      <div className="relative bg-zinc-900/60 border-2 border-red-900/20 rounded-2xl overflow-hidden hover:border-red-900/40 transition-colors">
		        <div className="bg-red-950/20 px-4 py-2 border-b border-red-900/20 flex justify-center items-center">
		          <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">
		            {m.type}
		          </span>
		        </div>

		        <div className="p-5">
		           <MatchRow match={m} size="md" />
		        </div>
		        
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

      {/* --- DEMIS --- */}
		<section className="mb-20">
		  <div className="flex items-center gap-3 mb-8">
		    <div className="bg-zinc-800 p-2 rounded-lg">
		      <Medal className="text-gray-400" size={24} />
		    </div>
		    <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
		      <span className="text-white">Les</span><span className="text-red-600"> Demis</span>
		    </h2>
		    <div className="flex-1 h-px bg-gradient-to-r from-zinc-700 to-transparent ml-4" />
		  </div>

		  <div className="grid md:grid-cols-2 gap-8">
		    {demis.map((m) => (
		      <div key={m.id} className="relative group">
		        <div className="absolute -inset-0.5 bg-zinc-600/20 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition-opacity"></div>
		        
		        <div className="relative bg-zinc-900/60 border-2 border-zinc-700/50 rounded-2xl overflow-hidden">
		          <div className="bg-zinc-800/80 px-4 py-2 border-b border-zinc-700/50 flex justify-between items-center">
		            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
		              Tableau {m.tableau}
		            </span>
		            <span className="text-[9px] font-bold bg-zinc-700 px-2 py-0.5 rounded text-white/70 uppercase">
		              Match en 13 points
		            </span>
		          </div>

		          <div className="p-6">
		             <MatchRow match={m} size="md" />
		          </div>
		        </div>
		      </div>
		    ))}
		  </div>
		</section>
		
      {/* --- CLASSEMENT DES POULES --- */}
	 <section className="mb-20">
	   <div className="flex items-center gap-3 mb-8">
	     <Users className="text-red-600" size={24} />
	     <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">
	       <span className="text-white">Classement</span><span className="text-red-600"> des Poules</span>
	     </h2>
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
	                   <span className={`text-xs font-black ${idx < 2 ? 'text-red-600' : 'text-gray-600'}`}>{idx + 1}</span>
	                 </td>
	                 <td className="px-4 py-3">
	                     <div className="flex flex-col">
	                       <span className="text-red-500 font-bold uppercase text-xs">{team.tireur}</span>
	                       <span className="text-white font-bold uppercase text-xs leading-none">{team.pointeur}</span>
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

      {/* --- DÉTAILS DES MATCHS DE POULES --- */}

<div className="grid lg:grid-cols-2 gap-10 mt-12">
  <section className="relative group">
    <div className="absolute -inset-1 bg-orange-600/20 rounded-2xl blur-sm opacity-50"></div>
    <div className="relative bg-zinc-900/40 border-2 border-orange-600/50 rounded-2xl overflow-hidden">
      <div className="bg-orange-600/10 px-5 py-4 border-b border-orange-600/30 flex items-center justify-between">
        <h3 className="text-2xl font-black uppercase italic text-orange-500 flex items-center gap-3">
          <Target size={24} />Gassin
        </h3>
        <div className=" flex justify-between items-center">
          <span className="text-[9px] font-bold bg-orange-700 px-2 py-0.5 rounded text-white uppercase">
            Match de 20 minutes
          </span>
        </div>
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

  <section className="relative group">
    <div className="absolute -inset-1 bg-purple-600/20 rounded-2xl blur-sm opacity-50"></div>
    <div className="relative bg-zinc-900/40 border-2 border-purple-600/50 rounded-2xl overflow-hidden">
      <div className="bg-purple-600/10 px-5 py-4 border-b border-purple-600/30 flex items-center justify-between">
        <h3 className="text-2xl font-black uppercase italic text-purple-500 flex items-center gap-3">
          <Target size={24} />Ramatuelle
        </h3>
        <div className=" flex justify-between items-center">
          <span className="text-[9px] font-bold bg-purple-700 px-2 py-0.5 rounded text-white uppercase">
            Match de 20 minutes
          </span>
        </div>
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

function MatchRow({ match, size = 'md' }: { match: any, size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const isLarge = size === 'lg';
  return (
    <div className="flex justify-between items-center gap-4">
      <div className="flex-1 text-center">
        <div className={`flex flex-col ${isLarge ? 'md:text-2xl text-md' : 'text-[11px]'} font-bold items-end`}>
          <span className="text-red-500 uppercase">{match.team_1?.tireur?.nom}</span>
          <span className="text-white uppercase leading-none">{match.team_1?.pointeur?.nom}</span>
        </div>
      </div>
      <div className={`font-mono font-black italic bg-black border border-red-600/20 rounded px-3 py-1 ${isLarge ? 'md:text-4xl text-xl' : 'text-sm'}`}>
        {match.score_1}-{match.score_2}
      </div>
      <div className="flex-1 text-center">
        <div className={`flex flex-col ${isLarge ? 'md:text-2xl text-md' : 'text-[11px]'} font-bold items-start`}>
          <span className="text-red-500 uppercase">{match.team_2?.tireur?.nom}</span>
          <span className="text-white uppercase leading-none">{match.team_2?.pointeur?.nom}</span>
        </div>
      </div>
    </div>
  );
}
