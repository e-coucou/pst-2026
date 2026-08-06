import { ImageResponse } from 'next/og';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const gameId = parseInt(id, 10);
  if (Number.isNaN(gameId)) {
    return new Response('Identifiant de match invalide', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Authentification requise', { status: 401 });
  }

  const { data: game } = await supabase
    .from('games')
    .select('id, year, type, poule, tableau, score_1, score_2, team_1_id, team_2_id')
    .eq('id', gameId)
    .single();

  if (!game) {
    return new Response('Match introuvable', { status: 404 });
  }

  const { data: teams } = await supabase
    .from('teams')
    .select('id, tireur_id, pointeur_id')
    .in('id', [game.team_1_id, game.team_2_id]);
  const teamsMap = new Map((teams || []).map(t => [t.id, t]));
  const team1 = teamsMap.get(game.team_1_id);
  const team2 = teamsMap.get(game.team_2_id);

  const playerIds = [team1?.tireur_id, team1?.pointeur_id, team2?.tireur_id, team2?.pointeur_id]
    .filter((v): v is number => v != null);
  const { data: profiles } = await supabase.from('profiles').select('id, nom').in('id', playerIds);
  const nameMap = new Map((profiles || []).map(p => [p.id, p.nom]));

  const team1Names = { tireur: nameMap.get(team1?.tireur_id) ?? '?', pointeur: nameMap.get(team1?.pointeur_id) ?? '?' };
  const team2Names = { tireur: nameMap.get(team2?.tireur_id) ?? '?', pointeur: nameMap.get(team2?.pointeur_id) ?? '?' };

  const win1 = game.score_1 > game.score_2;
  const win2 = game.score_2 > game.score_1;

  const subtitle = [game.year, game.type, game.poule].filter(Boolean).join(' · ');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#000000',
          color: '#ffffff',
          padding: 64,
          position: 'relative',
        }}
      >
        {/* Halo décoratif */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: 400,
            background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, rgba(220,38,38,0) 70%)',
            display: 'flex',
          }}
        />

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase' }}>
            PST <span style={{ color: '#dc2626', marginLeft: 10 }}>Pétanque</span>
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 3 }}>
            {subtitle}
          </div>
        </div>

        {/* CORPS : ÉQUIPES + SCORE */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56 }}>
          <TeamBlock tireur={team1Names.tireur} pointeur={team1Names.pointeur} isWinner={win1} align="flex-end" />

          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div style={{ display: 'flex', fontSize: 150, fontWeight: 900, fontStyle: 'italic', color: win1 ? '#dc2626' : '#ffffff' }}>
              {game.score_1}
            </div>
            <div style={{ display: 'flex', fontSize: 64, color: '#52525b' }}>-</div>
            <div style={{ display: 'flex', fontSize: 150, fontWeight: 900, fontStyle: 'italic', color: win2 ? '#dc2626' : '#ffffff' }}>
              {game.score_2}
            </div>
          </div>

          <TeamBlock tireur={team2Names.tireur} pointeur={team2Names.pointeur} isWinner={win2} align="flex-start" />
        </div>

        {/* FOOTER */}
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: 16, color: '#71717a', textTransform: 'uppercase', letterSpacing: 4 }}>
          Paris — Saint-Tropez
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'private, max-age=3600',
      },
    }
  );
}

function TeamBlock({
  tireur,
  pointeur,
  isWinner,
  align,
}: {
  tireur: string;
  pointeur: string;
  isWinner: boolean;
  align: 'flex-start' | 'flex-end';
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 10, minWidth: 260 }}>
      {isWinner && (
        <div
          style={{
            display: 'flex',
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#dc2626',
          }}
        >
          Victoire
        </div>
      )}
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#fb923c' }}>
        {tireur}
      </div>
      <div style={{ display: 'flex', fontSize: 30, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#c084fc' }}>
        {pointeur}
      </div>
    </div>
  );
}
