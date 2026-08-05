import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Trophy, ArrowRight, ChevronLeft, Target, Zap, User, Activity, TrendingUp,Star } from 'lucide-react';


type Method = 'pst' | 'modern' | 'skill';

const METHOD_META: Record<Method, { label: string; field: 'elo_value' | 'elo_modern_value' | 'skill_ordinal'; color: string; ring: string }> = {
  pst: { label: 'Classic', field: 'elo_value', color: 'text-red-600', ring: 'bg-red-600' },
  modern: { label: 'Modern', field: 'elo_modern_value', color: 'text-purple-400', ring: 'bg-purple-600' },
  skill: { label: 'Dynamique', field: 'skill_ordinal', color: 'text-emerald-400', ring: 'bg-emerald-600' },
};

export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ method?: string }> }) {
  const { method: rawMethod } = await searchParams;
  const method: Method = rawMethod === 'modern' || rawMethod === 'skill' ? rawMethod : 'pst';
  const meta = METHOD_META[method];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="p-20 text-center text-white font-black italic">Veuillez vous connecter pour voir le classement.</div>;
  }
  // 1. Récupération des profils et de l'historique
  const [profilesRes, historyRes, favoriRes] = await Promise.all([
    supabase.from('profiles').select('id, nom, photo_url'),
    supabase.from('elo_history').select('player_id, elo_value, elo_modern_value, skill_ordinal').order('id', { ascending: false }),
    supabase.from('site_users').select('favoris').eq('id', user.id).single()
  ]);

  const favori = favoriRes.data?.favoris;
  const profiles = profilesRes.data || [];
  const rawHistory = historyRes.data || [];

  // 2. SIGNATURE GROUPÉE DES PHOTOS (Pour la sécurité)
  // On récupère tous les noms de fichiers non nuls
  const filePaths = profiles
    .map(p => p.photo_url)
    .filter((path): path is string => Boolean(path));

  let signedUrls: Record<string, string> = {};

  if (filePaths.length > 0) {
    const { data } = await supabase.storage
      .from('joueurs_photos')
      .createSignedUrls(filePaths, 3600); // On signe tout d'un coup pour 1h

    // On crée un dictionnaire { "jean.jpg": "https://token..." }
    data?.forEach(item => {
      if (item.path && item.signedUrl) {
        signedUrls[item.path] = item.signedUrl;
      }
    });
  }

  // 3. Mapping des scores les plus récents (selon la méthode de classement sélectionnée)
  const latestScoresMap: Record<string, number> = {};
  rawHistory.forEach(entry => {
    const pid = String(entry.player_id);
    if (!(pid in latestScoresMap) && entry[meta.field] != null) {
      latestScoresMap[pid] = parseFloat(entry[meta.field]);
    }
  });

  // 4. Construction du tableau final
  // Défaut par méthode : 100 pour Classic/Modern (elo_init), 0 pour Dynamique (ordinal d'un
  // rating openskill jamais mis à jour, mu=25/sigma=8.33 -> mu-3*sigma=0).
  const defaultScore = method === 'skill' ? 0 : 100;
  const leaderboard = profiles.map(p => {
    const pid = String(p.id);
    return {
      id: p.id,
      nom: p.nom || `Joueur #${p.id}`,
      elo: latestScoresMap[pid] ?? defaultScore,
      // On récupère l'URL signée depuis le dictionnaire
      photo: p.photo_url ? signedUrls[p.photo_url] : null
    };
  }).sort((a, b) => b.elo - a.elo);

  if (leaderboard.length === 0) {
    return <div className="p-20 text-center text-white font-black italic">Aucune donnée trouvée.</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">

	  {/* SECTION ACCÈS ANALYTICS (egger!)*/}
	  <div className="max-w-2xl mx-auto mb-8 px-4 flex justify-end relative">
	    <Link 
	      href="/classement/progression" 
	      className="group flex items-center gap-3 px-5 py-2 bg-zinc-800/40 hover:bg-red-600/80 border border-white/5 rounded-2xl transition-all"
	    >
	      <div className="relative">
	        <Activity size={14} className="text-red-600 relative z-10" />
	        <div className="absolute inset-0 bg-red-600 blur-md opacity-20 group-hover:opacity-100 transition-opacity" />
	      </div>
	      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-white transition-colors">
	        Live Analytics
	      </span>
	      <ArrowRight size={12} className="text-zinc-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all" />
	    </Link>
	  </div>

	{/* Bascule entre les 3 méthodes de classement */}
	  <div className="max-w-2xl mx-auto mb-6 px-4 flex justify-center gap-3">
	    {(Object.keys(METHOD_META) as Method[]).map(m => (
	      <Link
	        key={m}
	        href={m === 'pst' ? '/classement' : `/classement?method=${m}`}
	        className={`px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
	          method === m
	            ? `${METHOD_META[m].ring} text-white shadow-lg`
	            : 'bg-zinc-900 text-zinc-500 border border-white/5 hover:bg-zinc-800'
	        }`}
	      >
	        {METHOD_META[m].label}
	      </Link>
	    ))}
	  </div>

	{/* Le tableau de classement */}
      <div className="max-w-2xl mx-auto -mt-2 mb-12 px-4 relative z-10">
        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
          <div className="divide-y divide-white/5">
            {leaderboard.map((player, index) => {
              const isTop3 = index < 3;
              const rankColor = index === 0 ? 'text-red-600' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-orange-500' : 'text-zinc-400';

              return (
                <Link key={player.id} href={`/joueurs/${player.id}`} className="flex items-center p-4 sm-p6 hover:bg-white/5 transition-all group">
                  {/* RANG */}
                  <div className={`w-8 sm:w-12 flex justify-center text-xl font-black italic ${rankColor}`}>
                    {index + 1}
                  </div>

                  {/* VIGNETTE PHOTO SIGNÉE */}
                  <div className="ml-4 relative">
                    {player.photo ? (
                      <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl overflow-hidden border border-white/10 group-hover:border-red-600/50 transition-colors">
                        <img src={player.photo} alt={player.nom} className="w-full h-full object-cover group-hover:scale-[1.5]" />
                      </div>
                    ) : (
                      <div className="w-10 sm:w-12 sm:h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5">
                        <User size={20} className="text-zinc-400" />
                      </div>
                    )}
                  </div>
                  {/* INFOS */}
                  <div className="flex-1 ml-6">
                    <span className="text-sm truncate sm:text-lg font-black uppercase italic text-white group-hover:text-red-500 transition-colors">
                      {player.nom}
                    </span>
                  </div>
                  {/* ELO */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className={`hidden md:block text-[9px] font-black uppercase mb-1 ${meta.color}`}>{meta.label}</p>
                      <p className="text-sm sm:text-3xl font-mono font-black italic text-white leading-none">
                        {player.elo.toFixed(0)}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-zinc-500 group-hover:text-red-600 transition-all" />
                    <Star size={14} className={`${player.id === favori ? "text-red-600 fill-red-600" : "text-zinc-400 fill-zinc-600"}`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}