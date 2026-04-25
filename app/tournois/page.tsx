import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Trophy, Swords, ChevronRight, Zap, Target } from 'lucide-react';

export default async function TournamentsPage() {
  const supabase = await createClient();

  // 1. Récupérer les finales pour le palmarès
  const { data: seasonsData, error } = await supabase
    .from('games')
    .select(`
      year,
      score_1,
      score_2,
      team_1:team_1_id (
        nom,
        tireur:profiles!fk_teams_tireur ( nom ),
        pointeur:profiles!fk_teams_pointeur ( nom )
      ),
      team_2:team_2_id (
        nom,
        tireur:profiles!fk_teams_tireur ( nom ),
        pointeur:profiles!fk_teams_pointeur ( nom )
      )
    `)
    .eq('type', 'Finale') 
    .eq('tableau', 'Principal') // On cible la grande finale pour le palmarès
    .order('year', { ascending: false });

  if (error) console.error("Erreur :", error.message);

  // 2. Récupérer les stats (Nombre de matchs par an)
  const { data: allMatches } = await supabase.from('games').select('year');
  
  const matchCounts = allMatches?.reduce((acc: any, curr) => {
    acc[curr.year] = (acc[curr.year] || 0) + 1;
    return acc;
  }, {});



	// 1. Définition d'un type local pour clarifier ce que Supabase renvoie
	type TeamData = {
	  nom: string;
	  tireur: { nom: string };
	  pointeur: { nom: string };
	};

	// 2. Mapping avec cast de type
	const tournaments = seasonsData?.map(game => {
	  const isTeam1Winner = (game.score_1 ?? 0) > (game.score_2 ?? 0);
	  
	  // On force le type en récupérant l'objet unique (Supabase renvoie parfois un objet ou un tableau selon la config)
	  // On s'assure que TypeScript traite winner comme un objet TeamData seul
	  const winnerRaw = isTeam1Winner ? game.team_1 : game.team_2;
	  
	  // Cast de sécurité : si c'est un tableau, on prend le premier élément, sinon l'objet
	  const winner = (Array.isArray(winnerRaw) ? winnerRaw[0] : winnerRaw) as unknown as TeamData;
	  
	  return {
	    year: game.year,
	    winnerTeam: winner?.nom || "Équipe Inconnue",
	    tireur: winner?.tireur?.nom || "Inconnu",
	    pointeur: winner?.pointeur?.nom || "Inconnu",
	    score: `${game.score_1} - ${game.score_2}`,
	    totalMatchs: matchCounts?.[game.year] || 0
	  };
	});

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-16 min-h-screen bg-black text-white">
      
      {/* HEADER : STYLE PARIS SAINT-TROPEZ */}
      <header className="mb-20 relative">
        <div className="absolute -left-8 top-0 w-1.5 h-full bg-red-600 rounded-full hidden md:block" />
        <h1 className="text-7xl md:text-9xl font-black uppercase italic tracking-tighter leading-[0.8]">
          LES <br />
          <span className="text-red-600">TOURNOIS</span>
        </h1>
        <p className="mt-4 text-gray-500 font-bold uppercase tracking-[0.4em] text-xs italic">
          Archives et Palmarès Officiels
        </p>
      </header>

      {/* GRILLE DES ÉDITIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {tournaments?.map((t) => (
          <Link 
            href={`/tournois/${t.year}`} 
            key={t.year}
            className="group relative bg-zinc-800/40 border border-white/5 rounded-[2rem] overflow-hidden hover:border-red-300 transition-all duration-500"
          >
            {/* Effet de lueur au survol */}
            <div className="absolute -inset-1 bg-red-600 opacity-0 group-hover:opacity-5 blur-2xl transition-opacity" />

            <div className="p-10 relative">
              {/* Année & Badge */}
              <div className="flex justify-between items-start mb-16">
                <span className="text-6xl font-black italic text-white/50 group-hover:text-red-600/80 transition-colors">
                  {t.year}
                </span>
                <div className="bg-red-600 p-4 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.3)] group-hover:scale-110 transition-transform duration-500">
                  <Trophy size={28} className="text-white" />
                </div>
              </div>

              {/* Infos Champions */}
              <div className="space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-red-600 fill-red-600" />
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Champions Édition {t.year}</span>
                  </div>
                  
                  <h3 className="text-3xl font-black italic uppercase text-white group-hover:text-red-500 transition-colors leading-tight">
                    {t.pointeur} <br />
                    <span className="text-red-600">&</span> {t.tireur}
                  </h3>
                  
                  <div className="mt-4 inline-flex items-center gap-2 bg-black/50 border border-white/10 px-4 py-1 rounded-lg">
                     <span className="text-[10px] font-bold text-gray-500 uppercase">Score Finale</span>
                     <span className="text-sm font-mono font-black text-red-500">{t.score}</span>
                  </div>
                </div>

                {/* Footer de la carte */}
                <div className="flex items-center justify-between pt-8 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">Volume de jeu</span>
                    <span className="text-xs font-bold text-gray-400">{t.totalMatchs} MATCHS JOUÉS</span>
                  </div>

                  <div className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl text-[11px] font-black uppercase group-hover:bg-red-600 group-hover:text-white transition-all duration-300">
                    Détails <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* État vide */}
      {(!tournaments || tournaments.length === 0) && (
        <div className="py-32 text-center border-2 border-dashed border-zinc-800 rounded-[3rem]">
          <Swords size={64} className="mx-auto text-zinc-800 mb-6" />
          <h3 className="text-xl font-black uppercase italic text-gray-600">Aucune archive disponible</h3>
          <p className="text-gray-700 text-xs uppercase tracking-widest mt-2 font-bold">Le club n'a pas encore de données pour cette section</p>
        </div>
      )}
    </div>
  );
}
