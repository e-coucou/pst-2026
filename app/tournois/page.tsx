import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Trophy, Swords, ChevronRight, Zap } from 'lucide-react';
import Image from 'next/image';

export default async function TournamentsPage() {
  const supabase = await createClient();

  // 1. Récupération des données augmentée des IDs pour les photos
  const { data: seasonsData, error } = await supabase
    .from('games')
    .select(`
      year,
      score_1,
      score_2,
      team_1:team_1_id (
        nom,
        tireur:profiles!fk_teams_tireur ( id, nom, photo_url ),
        pointeur:profiles!fk_teams_pointeur ( id, nom, photo_url )
      ),
      team_2:team_2_id (
        nom,
        tireur:profiles!fk_teams_tireur ( id, nom, photo_url ),
        pointeur:profiles!fk_teams_pointeur ( id, nom, photo_url )
      )
    `)
    .eq('type', 'Finale') 
    .eq('tableau', 'Principal')
    .order('year', { ascending: false });

  if (error) console.error("Erreur :", error.message);

  const { data: allMatches } = await supabase.from('games').select('year');

  // 2. Gestion des photos signées
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

  const matchCounts = allMatches?.reduce((acc: any, curr) => {
    acc[curr.year] = (acc[curr.year] || 0) + 1;
    return acc;
  }, {});

  type ProfileData = { id: number; nom: string; photo_url: string | null };
  type TeamData = { nom: string; tireur: ProfileData; pointeur: ProfileData };

  const tournaments = seasonsData?.map(game => {
    const isTeam1Winner = (game.score_1 ?? 0) > (game.score_2 ?? 0);
    const winnerRaw = isTeam1Winner ? game.team_1 : game.team_2;
    const winner = (Array.isArray(winnerRaw) ? winnerRaw[0] : winnerRaw) as unknown as TeamData;
    
    return {
      year: game.year,
      winnerTeam: winner?.nom || "Équipe Inconnue",
      tireur: winner?.tireur?.nom || "Inconnu",
      pointeur: winner?.pointeur?.nom || "Inconnu",
      photoTireur: winner?.tireur?.photo_url ? signedUrls[winner.tireur.photo_url] : null,
      photoPointeur: winner?.pointeur?.photo_url ? signedUrls[winner.pointeur.photo_url] : null,
      score: `${game.score_1} - ${game.score_2}`,
      totalMatchs: matchCounts?.[game.year] || 0
    };
  });

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-16 min-h-screen bg-black text-white">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {tournaments?.map((t) => (
          <Link 
            href={`/tournois/${t.year}`} 
            key={t.year}
            className="group relative bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-red-600/50 transition-all duration-700"
          >
            <div className="p-10 relative z-10">
              {/* HEADER CARTE */}
              <div className="flex justify-between items-start mb-16">
                <span className="text-7xl font-black italic text-white/20 group-hover:text-red-600/40 transition-colors duration-700">
                  {t.year}
                </span>
                <div className="bg-red-600 p-4 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.4)] group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 relative z-30">
                  <Trophy size={28} className="text-white" />
                </div>
              </div>

              {/* ZONE PHOTOS (Desktop) - Écartement accentué */}
              <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden lg:block w-56 h-56">
                {/* Photo 1 (Tireur, Arrière-plan, plus grand) */}
                <div className="absolute -top-6 left-0 w-32 h-36 border-2 border-red-600/20 rounded-2xl overflow-hidden rotate-[-15deg] group-hover:rotate-[-22deg] group-hover:scale-105 transition-all duration-700 bg-zinc-800 z-10 shadow-xl">
                  {t.photoTireur ? (
                    <img 
                      src={t.photoTireur} 
                      alt={t.tireur}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700 font-black italic">TIREUR</div>
                  )}
                </div>

                {/* Photo 2 (Pointeur, Premier plan) */}
                <div className="absolute -bottom-6 right-0 w-28 h-32 border-2 border-red-600 rounded-2xl overflow-hidden rotate-[10deg] group-hover:rotate-[18deg] group-hover:scale-110 transition-all duration-700 shadow-2xl bg-zinc-800 z-20">
                  {t.photoPointeur ? (
                    <img 
                      src={t.photoPointeur} 
                      alt={t.pointeur}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700 font-black italic">POINTEUR</div>
                  )}
                </div>
              </div>

              {/* Infos Champions - max-w adapté */}
              <div className="space-y-8 lg:max-w-[55%]">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-red-600 fill-red-600" />
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Champions {t.year}</span>
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

                <div className="flex items-center justify-between pt-8 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-600 font-black uppercase">Volume de jeu</span>
                    <span className="text-xs font-bold text-gray-400">{t.totalMatchs} MATCHS</span>
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
    </div>
  );
}
