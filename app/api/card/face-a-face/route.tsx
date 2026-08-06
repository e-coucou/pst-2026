import { ImageResponse } from 'next/og';
import { createClient } from '@/utils/supabase/server';
import { computeHeadToHead } from '@/utils/head-to-head';

const SHELL_STYLE = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  backgroundColor: '#000000',
  color: '#ffffff',
  padding: 64,
  position: 'relative' as const,
};

const HALO_STYLE = {
  position: 'absolute' as const,
  top: -120,
  right: -120,
  width: 400,
  height: 400,
  borderRadius: 400,
  background: 'radial-gradient(circle, rgba(220,38,38,0.35) 0%, rgba(220,38,38,0) 70%)',
  display: 'flex',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const aId = parseInt(searchParams.get('a') || '', 10);
  const bId = parseInt(searchParams.get('b') || '', 10);

  if (Number.isNaN(aId) || Number.isNaN(bId) || aId === bId) {
    return new Response('Paramètres invalides', { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Authentification requise', { status: 401 });
  }

  const [{ data: profiles }, { summary }] = await Promise.all([
    supabase.from('profiles').select('id, nom').in('id', [aId, bId]),
    computeHeadToHead(supabase, aId, bId),
  ]);

  const nameMap = new Map((profiles || []).map(p => [p.id, p.nom]));
  const nameA = nameMap.get(aId) ?? `Joueur #${aId}`;
  const nameB = nameMap.get(bId) ?? `Joueur #${bId}`;

  if (!summary) {
    return new ImageResponse(
      (
        <div style={SHELL_STYLE}>
          <div style={HALO_STYLE} />
          <Header />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', fontSize: 44, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
              {nameA} <span style={{ color: '#52525b', margin: '0 20px' }}>vs</span> {nameB}
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#71717a', textTransform: 'uppercase', letterSpacing: 3 }}>
              Aucune confrontation directe
            </div>
          </div>
          <Footer />
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const diff = summary.pointsPour - summary.pointsContre;

  return new ImageResponse(
    (
      <div style={SHELL_STYLE}>
        <div style={HALO_STYLE} />
        <Header />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56 }}>
          <NameBlock name={nameA} count={summary.wins} highlight={summary.wins > summary.losses} align="flex-end" />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', fontSize: 18, color: '#71717a', textTransform: 'uppercase', letterSpacing: 3 }}>
              {summary.total} confrontation{summary.total > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, fontStyle: 'italic', color: '#52525b' }}>VS</div>
            <div style={{ display: 'flex', fontSize: 18, color: diff >= 0 ? '#dc2626' : '#a1a1aa' }}>
              {diff > 0 ? '+' : ''}{diff} pts
            </div>
          </div>

          <NameBlock name={nameB} count={summary.losses} highlight={summary.losses > summary.wins} align="flex-start" />
        </div>

        <Footer />
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

function Header() {
  return (
    <div style={{ display: 'flex', fontSize: 26, fontWeight: 900, letterSpacing: 6, textTransform: 'uppercase' }}>
      PST <span style={{ color: '#dc2626', marginLeft: 10 }}>Pétanque</span>
    </div>
  );
}

function Footer() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', fontSize: 16, color: '#71717a', textTransform: 'uppercase', letterSpacing: 4 }}>
      Paris — Saint-Tropez
    </div>
  );
}

function NameBlock({
  name,
  count,
  highlight,
  align,
}: {
  name: string;
  count: number;
  highlight: boolean;
  align: 'flex-start' | 'flex-end';
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: align, gap: 12, minWidth: 300 }}>
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', color: '#ffffff' }}>
        {name}
      </div>
      <div style={{ display: 'flex', fontSize: 120, fontWeight: 900, fontStyle: 'italic', color: highlight ? '#dc2626' : '#ffffff' }}>
        {count}
      </div>
      <div style={{ display: 'flex', fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: '#71717a' }}>
        Victoires
      </div>
    </div>
  );
}
