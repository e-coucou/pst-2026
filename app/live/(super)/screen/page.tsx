'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2 } from 'lucide-react';

// Vue "à copier-coller" (en pratique : capture d'écran) pour diffuser la composition des
// équipes sur WhatsApp — fond blanc / texte noir gras, sans le thème néon habituel du site,
// pour rester lisible une fois compressé en image dans une conversation.
export default function LiveScreenPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<any[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      const { data: profilesData } = await supabase.from('profiles').select('id, nom');
      const pMap: Record<number, string> = {};
      if (profilesData) profilesData.forEach(p => pMap[p.id] = p.nom);
      setPlayersMap(pMap);

      const { data: teamsData } = await supabase
        .from('live_teams')
        .select('*')
        .neq('id', 'Z')
        .order('id', { ascending: true });
      if (teamsData) setTeams(teamsData);

      setLoading(false);
    };
    fetchData();
  }, []);

  const getName = (id: number) => playersMap[id] || `#${id}`;

  const poulesPresentes = Array.from(new Set(teams.map(t => t.poule))).filter(Boolean) as string[];

  const renderPoule = (pouleName: string) => {
    const pouleTeams = teams.filter(t => t.poule === pouleName);
    if (pouleTeams.length === 0) return null;

    return (
      <div key={pouleName} className="mb-8">
        <h2 className="text-2xl font-black uppercase border-b-2 border-black pb-1 mb-3">
          Poule {pouleName}
        </h2>
        <div className="divide-y divide-zinc-200">
          {pouleTeams.map(t => (
            <div key={t.id} className="flex items-baseline gap-3 py-2">
              <span className="font-black text-lg w-6 shrink-0">{t.id}</span>
              <span className="font-black text-xl truncate">
                {getName(t.pointeur_id)} / {getName(t.tireur_id)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-black" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black p-6">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs font-black uppercase text-zinc-500 mb-6"
        >
          <ArrowLeft size={14} /> Retour
        </button>

        <h1 className="text-3xl font-black uppercase text-center mb-8">
          Composition des équipes
        </h1>

        {poulesPresentes.length > 0 ? (
          poulesPresentes.map(renderPoule)
        ) : (
          <p className="text-center font-bold text-zinc-500">Aucune équipe pour le moment.</p>
        )}
      </div>
    </div>
  );
}
