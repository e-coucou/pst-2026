import { createClient } from '@/utils/supabase/server';
import MatchSearch from '@/components/MatchSearch';
import BackButton from '@/components/BackButton';
import { Search } from 'lucide-react';

interface ProfileRef {
  id: number;
  nom: string;
}

interface TeamRef {
  tireur: ProfileRef | ProfileRef[] | null;
  pointeur: ProfileRef | ProfileRef[] | null;
}

// Supabase peut renvoyer les relations to-one comme un objet ou un tableau à un élément
// selon l'inférence de la relation — même garde défensive que tournois/page.tsx.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export default async function MatchSearchPage() {
  const supabase = await createClient();

  const { data: games } = await supabase
    .from('games')
    .select(`
      id, year, type, poule, score_1, score_2,
      team_1:team_1_id ( tireur:profiles!fk_teams_tireur(id,nom), pointeur:profiles!fk_teams_pointeur(id,nom) ),
      team_2:team_2_id ( tireur:profiles!fk_teams_tireur(id,nom), pointeur:profiles!fk_teams_pointeur(id,nom) )
    `)
    .order('year', { ascending: false })
    .order('id', { ascending: false });

  const { data: profiles } = await supabase.from('profiles').select('id, nom').order('nom');

  const matches = (games || []).map(g => {
    const team1 = one<TeamRef>(g.team_1 as TeamRef | TeamRef[] | null);
    const team2 = one<TeamRef>(g.team_2 as TeamRef | TeamRef[] | null);
    const tireur1 = one(team1?.tireur);
    const pointeur1 = one(team1?.pointeur);
    const tireur2 = one(team2?.tireur);
    const pointeur2 = one(team2?.pointeur);

    return {
      id: g.id,
      year: g.year,
      type: g.type,
      poule: g.poule,
      score1: g.score_1,
      score2: g.score_2,
      team1: { tireurId: tireur1?.id ?? null, tireurNom: tireur1?.nom ?? '?', pointeurId: pointeur1?.id ?? null, pointeurNom: pointeur1?.nom ?? '?' },
      team2: { tireurId: tireur2?.id ?? null, tireurNom: tireur2?.nom ?? '?', pointeurId: pointeur2?.id ?? null, pointeurNom: pointeur2?.nom ?? '?' },
    };
  });

  const years = Array.from(new Set(matches.map(m => m.year))).sort((a, b) => b - a);
  const types = Array.from(new Set(matches.map(m => m.type).filter(Boolean))).sort();

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 space-y-8 bg-black text-white min-h-screen">
      <BackButton fallbackHref="/tournois" />

      <div className="flex items-center gap-4">
        <Search size={28} className="text-red-600" />
        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">Recherche de matchs</h1>
      </div>

      <MatchSearch matches={matches} players={profiles || []} years={years} types={types} />
    </div>
  );
}
