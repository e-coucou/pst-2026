'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';

interface RankedTeam {
  rank: number;
  pointeurName: string;
  tireurName: string;
}

interface FinaleScore {
  score1: number;
  score2: number;
  pointeur1: string;
  tireur1: string;
  pointeur2: string;
  tireur2: string;
}

// Vue "à copier-coller" (en pratique : capture d'écran) pour diffuser le palmarès final sur
// WhatsApp — même principe que /live/screen (équipes) : fond blanc pour rester lisible une fois
// compressé en image, mais avec les couleurs d'accent du site (rouge/violet/orange) plutôt que
// le noir/blanc pur de l'écran équipes, pour distinguer classement et rôles au premier coup d'œil.
export default function ScreenPodiumPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [season, setSeason] = useState<number | null>(null);
  const [finalTop8, setFinalTop8] = useState<RankedTeam[]>([]);
  const [laFinale, setLaFinale] = useState<FinaleScore | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: profilesData } = await supabase.from('profiles').select('id, nom');
      const pMap: Record<number, string> = {};
      (profilesData || []).forEach(p => pMap[p.id] = p.nom);
      const getName = (id: number) => pMap[id] || `#${id}`;

      const { data: teams } = await supabase.from('live_teams').select('*').neq('id', 'Z');
      const { data: matches } = await supabase.from('live_matches').select('*');
      const { data: steps } = await supabase.from('steps').select('id, value');
      const { data: seasons } = await supabase.from('seasons').select('year').eq('is_active', true);

      if (seasons && seasons.length > 0) setSeason(seasons[0].year);

      const stepValues: Record<string, number> = Object.fromEntries((steps || []).map(s => [s.id, s.value]));
      const teamsById: Record<string, any> = {};
      (teams || []).forEach(t => { teamsById[t.id] = t; });

      const results: RankedTeam[] = [];
      let finaleFound: FinaleScore | null = null;

      // Même détection générique que podium/page.tsx (finalTop8) : filtre par sous-chaîne
      // "inale" puis rang via steps.value, indépendant du format (classique/10_equipes/ronde).
      (matches || []).filter(m => m.type?.toLowerCase().includes('inale')).forEach(m => {
        const baseRank = stepValues[m.type];
        if (!baseRank) return;

        const isTeam1Winner = (m.score_team1 ?? 0) > (m.score_team2 ?? 0);
        const t1 = teamsById[m.team1_id];
        const t2 = teamsById[m.team2_id];

        if (t1) results.push({ rank: isTeam1Winner ? baseRank : baseRank + 1, pointeurName: getName(t1.pointeur_id), tireurName: getName(t1.tireur_id) });
        if (t2) results.push({ rank: isTeam1Winner ? baseRank + 1 : baseRank, pointeurName: getName(t2.pointeur_id), tireurName: getName(t2.tireur_id) });

        if (baseRank === 1) {
          finaleFound = {
            score1: m.score_team1,
            score2: m.score_team2,
            pointeur1: t1 ? getName(t1.pointeur_id) : '?',
            tireur1: t1 ? getName(t1.tireur_id) : '?',
            pointeur2: t2 ? getName(t2.pointeur_id) : '?',
            tireur2: t2 ? getName(t2.tireur_id) : '?',
          };
        }
      });

      results.sort((a, b) => a.rank - b.rank);
      setFinalTop8(results);
      setLaFinale(finaleFound);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-4">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500 mb-2"
        >
          <ArrowLeft size={14} /> Retour
        </button>

        <div className="text-center mb-3">
          <Trophy className="text-red-600 mx-auto mb-1" size={24} />
          <h1 className="text-2xl font-black uppercase leading-none">
            Résultats {season && <span className="text-red-600">{season}</span>}
          </h1>
        </div>

        {laFinale && (
          <div className="border-2 border-red-600 rounded-2xl p-3 mb-3 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="text-right font-black text-base leading-tight">
                <div className="text-purple-600">{laFinale.pointeur1}</div>
                <div className="text-orange-600">{laFinale.tireur1}</div>
              </div>
              <div className="font-mono font-black text-xl bg-black text-white px-3 py-1 rounded-lg shrink-0">
                {laFinale.score1}-{laFinale.score2}
              </div>
              <div className="text-left font-black text-base leading-tight">
                <div className="text-purple-600">{laFinale.pointeur2}</div>
                <div className="text-orange-600">{laFinale.tireur2}</div>
              </div>
            </div>
          </div>
        )}

        {finalTop8.length > 0 ? (
          <div className="divide-y divide-zinc-200">
            {finalTop8.map((r, idx) => (
              <div key={idx} className="flex items-center gap-3 py-1">
                <span className={`font-black text-base w-7 shrink-0 ${r.rank === 1 ? 'text-red-600' : 'text-zinc-400'}`}>
                  #{r.rank}
                </span>
                <div className="flex-1 font-black text-base leading-tight">
                  <span className="text-purple-600">{r.pointeurName}</span>
                  {' / '}
                  <span className="text-orange-600">{r.tireurName}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center font-bold text-zinc-500">Aucun résultat pour le moment.</p>
        )}
      </div>
    </div>
  );
}
