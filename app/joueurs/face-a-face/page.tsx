import { createClient } from '@/utils/supabase/server';
import FaceAFaceSelector from '@/components/FaceAFaceSelector';
import StatsCard from '@/components/StatsCard';
import FavoriStar from '@/components/FavoriStar';
import ShareMatchButton from '@/components/ShareMatchButton';
import Link from 'next/link';
import { ChevronLeft, Swords, Users, Trophy } from 'lucide-react';

interface PlayerLite {
  id: number;
  nom: string;
  photo?: string | null;
}

interface Confrontation {
  gameId: number;
  year: number;
  type: string;
  poule: string;
  role: string;
  scorePour: number;
  scoreContre: number;
  result: number; // 1 victoire / -1 défaite / 0 nul (du point de vue du joueur A)
  partnerName: string | null;
  opponentPartnerName: string | null;
}

export default async function FaceAFacePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return <div className="p-20 text-center text-white font-black italic">Veuillez vous connecter pour voir le face-à-face.</div>;
  }

  const { a: aParam, b: bParam } = await searchParams;
  const aId = aParam ? parseInt(aParam, 10) : null;
  const bId = bParam ? parseInt(bParam, 10) : null;
  const hasSelection = aId != null && bId != null && !Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId;

  const [profilesRes, favoriRes] = await Promise.all([
    supabase.from('profiles').select('id, nom, photo_url').order('nom'),
    supabase.from('site_users').select('favoris').eq('id', user.id).single(),
  ]);

  const profiles = profilesRes.data || [];
  const favori = favoriRes.data?.favoris;
  const nameMap = new Map(profiles.map(p => [p.id, p.nom]));

  // Signature groupée des photos des deux joueurs sélectionnés
  const photoMap: Record<string, string> = {};
  const selectedProfiles = profiles.filter(p => p.id === aId || p.id === bId);
  const filePaths = selectedProfiles.map(p => p.photo_url).filter((p): p is string => Boolean(p));
  if (filePaths.length > 0) {
    const { data } = await supabase.storage.from('joueurs_photos').createSignedUrls(filePaths, 3600);
    data?.forEach(item => {
      if (item.path && item.signedUrl) photoMap[item.path] = item.signedUrl;
    });
  }

  const playerA: PlayerLite | null = aId != null
    ? { id: aId, nom: nameMap.get(aId) || `Joueur #${aId}`, photo: selectedProfiles.find(p => p.id === aId)?.photo_url ? photoMap[selectedProfiles.find(p => p.id === aId)!.photo_url!] : null }
    : null;
  const playerB: PlayerLite | null = bId != null
    ? { id: bId, nom: nameMap.get(bId) || `Joueur #${bId}`, photo: selectedProfiles.find(p => p.id === bId)?.photo_url ? photoMap[selectedProfiles.find(p => p.id === bId)!.photo_url!] : null }
    : null;

  let confrontations: Confrontation[] = [];

  if (hasSelection) {
    const { data: rows } = await supabase
      .from('elo_history')
      .select('*')
      .eq('player_id', aId)
      .or(`tireur_id.eq.${bId},pointeur_id.eq.${bId}`)
      .order('game_id', { ascending: false });

    if (rows && rows.length > 0) {
      const gameIds = rows.map(r => r.game_id);
      const { data: games } = await supabase
        .from('games')
        .select('id, team_1_id, team_2_id')
        .in('id', gameIds);
      const gamesMap = new Map((games || []).map(g => [g.id, g]));

      const teamIds = new Set<number>();
      (games || []).forEach(g => { teamIds.add(g.team_1_id); teamIds.add(g.team_2_id); });
      const { data: teams } = await supabase
        .from('teams')
        .select('id, tireur_id, pointeur_id')
        .in('id', Array.from(teamIds));
      const teamsMap = new Map((teams || []).map(t => [t.id, t]));

      confrontations = rows.map(r => {
        const game = gamesMap.get(r.game_id);
        let partnerName: string | null = null;
        if (game) {
          const candidates = [teamsMap.get(game.team_1_id), teamsMap.get(game.team_2_id)];
          const myTeam = candidates.find(t => t && (t.tireur_id === aId || t.pointeur_id === aId));
          if (myTeam) {
            const partnerId = myTeam.tireur_id === aId ? myTeam.pointeur_id : myTeam.tireur_id;
            partnerName = nameMap.get(partnerId) ?? null;
          }
        }

        const opponentIsTireur = r.tireur_id === bId;
        const opponentPartnerId = opponentIsTireur ? r.pointeur_id : r.tireur_id;
        const opponentPartnerName = nameMap.get(opponentPartnerId) ?? (opponentIsTireur ? r.pointeur : r.tireur) ?? null;

        return {
          gameId: r.game_id,
          year: r.year,
          type: r.type,
          poule: r.poule,
          role: r.role,
          scorePour: r.sc_p,
          scoreContre: r.sc_c,
          result: r.win,
          partnerName,
          opponentPartnerName,
        };
      });
    }
  }

  const summary = confrontations.length > 0 ? {
    total: confrontations.length,
    wins: confrontations.filter(c => c.result === 1).length,
    losses: confrontations.filter(c => c.result === -1).length,
    draws: confrontations.filter(c => c.result === 0).length,
    pointsPour: confrontations.reduce((s, c) => s + c.scorePour, 0),
    pointsContre: confrontations.reduce((s, c) => s + c.scoreContre, 0),
  } : null;

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-12 space-y-8 bg-black text-white min-h-screen">
      <Link href="/classement" className="inline-flex items-center gap-2 text-zinc-400 hover:text-red-600 transition-colors text-xs font-black uppercase tracking-widest">
        <ChevronLeft size={16} /> Classement
      </Link>

      <div className="flex items-center gap-4">
        <Swords size={28} className="text-red-600" />
        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">Face-à-face</h1>
      </div>

      <FaceAFaceSelector players={profiles.map(p => ({ id: p.id, nom: p.nom }))} initialA={aId ?? undefined} initialB={bId ?? undefined} />

      {!hasSelection && (
        <div className="py-20 text-center text-zinc-400 font-black uppercase tracking-widest">
          Choisissez deux joueurs pour voir leur historique direct.
        </div>
      )}

      {hasSelection && playerA && playerB && (
        <>
          {/* EN-TÊTE DES DEUX JOUEURS */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <PlayerBadge player={playerA} isFavori={playerA.id === favori} align="right" />
            <span className="text-2xl font-black italic text-zinc-500 uppercase">vs</span>
            <PlayerBadge player={playerB} isFavori={playerB.id === favori} align="left" />
          </div>

          {confrontations.length === 0 ? (
            <div className="py-20 text-center text-zinc-400 font-black uppercase tracking-widest">
              Aucune confrontation directe entre ces deux joueurs.
            </div>
          ) : (
            <>
              {/* BILAN CHIFFRÉ (du point de vue de Joueur A) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatsCard label="Matchs" value={summary!.total} color="zinc" />
                <StatsCard label={`Victoires ${playerA.nom}`} value={summary!.wins} color="red" />
                <StatsCard label={`Victoires ${playerB.nom}`} value={summary!.losses} color="orange" />
                <StatsCard label="Nuls" value={summary!.draws} color="zinc" />
                <StatsCard label="Diff. Pts" value={summary!.pointsPour - summary!.pointsContre} color="purple" />
              </div>

              {/* LISTE DES CONFRONTATIONS */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                  <Trophy size={18} className="text-red-600" />
                  <h2 className="text-sm font-black uppercase tracking-widest">Historique des confrontations</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-black/20 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                        <th className="px-4 py-3">Saison</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Équipe {playerA.nom}</th>
                        <th className="px-4 py-3 text-center">Score</th>
                        <th className="px-4 py-3">Équipe {playerB.nom}</th>
                        <th className="px-4 py-3 text-center">Résultat</th>
                        <th className="px-4 py-3 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {confrontations.map(c => (
                        <tr key={c.gameId} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4 text-sm font-bold">{c.year}</td>
                          <td className="px-4 py-4 text-xs text-zinc-400 uppercase">{c.type}</td>
                          <td className="px-4 py-4 text-xs">
                            <span className="font-bold">{playerA.nom}</span>
                            {c.partnerName && <span className="text-zinc-500"> &amp; {c.partnerName}</span>}
                          </td>
                          <td className="px-4 py-4 text-center font-mono font-black italic">{c.scorePour} - {c.scoreContre}</td>
                          <td className="px-4 py-4 text-xs">
                            <span className="font-bold">{playerB.nom}</span>
                            {c.opponentPartnerName && <span className="text-zinc-500"> &amp; {c.opponentPartnerName}</span>}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              c.result === 1 ? 'bg-green-500/10 text-green-500' : c.result === -1 ? 'bg-red-600/10 text-red-500' : 'bg-zinc-700/50 text-zinc-400'
                            }`}>
                              {c.result === 1 ? 'Victoire' : c.result === -1 ? 'Défaite' : 'Nul'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <ShareMatchButton gameId={c.gameId} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PlayerBadge({ player, isFavori, align }: { player: PlayerLite; isFavori: boolean; align: 'left' | 'right' }) {
  return (
    <Link
      href={`/joueurs/${player.id}`}
      className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : 'text-left'} group`}
    >
      <div className="w-14 h-14 rounded-full overflow-hidden border border-white/10 bg-zinc-900 shrink-0 group-hover:border-red-600/50 transition-colors">
        {player.photo ? (
          <img src={player.photo} alt={player.nom} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Users size={20} className="text-zinc-400" />
          </div>
        )}
      </div>
      <span className="text-lg font-black uppercase italic group-hover:text-red-500 transition-colors">
        {player.nom} <FavoriStar active={isFavori} />
      </span>
    </Link>
  );
}
