import { ImageResponse } from 'next/og';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = parseInt(id, 10);
  if (Number.isNaN(playerId)) {
    return new Response('Identifiant de joueur invalide', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Authentification requise', { status: 401 });
  }

  const [{ data: player }, { data: history }] = await Promise.all([
    supabase.from('profiles').select('id, nom, level').eq('id', playerId).single(),
    supabase.from('elo_history').select('win, elo_value, elo_modern_value, skill_ordinal, rank_at_time').eq('player_id', playerId).order('game_id', { ascending: true }),
  ]);

  if (!player) {
    return new Response('Joueur introuvable', { status: 404 });
  }

  const rows = history || [];
  const last = rows[rows.length - 1];
  const wins = rows.filter(r => Number(r.win) === 1).length;
  const losses = rows.filter(r => Number(r.win) === -1).length;
  const draws = rows.filter(r => Number(r.win) === 0).length;
  const winrate = rows.length > 0 ? Math.round((wins / rows.length) * 100) : 0;

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
          {player.level && (
            <div
              style={{
                display: 'flex',
                fontSize: 16,
                fontWeight: 900,
                letterSpacing: 3,
                textTransform: 'uppercase',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '8px 20px',
                borderRadius: 999,
              }}
            >
              {player.level}
            </div>
          )}
        </div>

        {/* NOM + RANG */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40 }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 0.9 }}>
            {player.nom}
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 3, marginTop: 16 }}>
            Ranking PST · <span style={{ color: '#ef4444', marginLeft: 6 }}>#{last?.rank_at_time ?? '--'}</span>
          </div>
        </div>

        {/* ELO CARDS */}
        <div style={{ display: 'flex', gap: 24, marginTop: 48 }}>
          <EloBlock label="ELO Score" value={(last?.elo_value ?? 100).toFixed(0)} color="#dc2626" bg="rgba(220,38,38,0.12)" />
          <EloBlock label="Modern" value={(last?.elo_modern_value ?? 100).toFixed(0)} color="#a855f7" bg="rgba(168,85,247,0.12)" />
          <EloBlock label="Dynamique" value={(last?.skill_ordinal ?? 0).toFixed(0)} color="#10b981" bg="rgba(16,185,129,0.12)" />
        </div>

        {/* STATS */}
        <div style={{ display: 'flex', gap: 40, marginTop: 48 }}>
          <StatBlock label="Matchs" value={rows.length} />
          <StatBlock label="Victoires" value={wins} color="#dc2626" />
          <StatBlock label="Nuls" value={draws} />
          <StatBlock label="Défaites" value={losses} color="#f97316" />
          <StatBlock label="Ratio" value={`${winrate}%`} color="#a855f7" />
        </div>

        <div style={{ flex: 1 }} />

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

function EloBlock({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: bg, borderRadius: 24, padding: '20px 32px', minWidth: 160 }}>
      <div style={{ display: 'flex', fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', fontSize: 44, fontWeight: 900, fontStyle: 'italic', color: '#ffffff' }}>
        {value}
      </div>
    </div>
  );
}

function StatBlock({ label, value, color = '#ffffff' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#71717a', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', fontSize: 36, fontWeight: 900, fontFamily: 'monospace', color }}>
        {value}
      </div>
    </div>
  );
}
