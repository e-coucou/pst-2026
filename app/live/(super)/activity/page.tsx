'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Activity, Loader2, X, RefreshCw } from 'lucide-react';
import { ACTION_LABELS, describePageView, formatMetadata } from '@/utils/activity-format';

interface ActivityLog {
  id: number;
  user_id: string;
  nickname: string | null;
  action_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Les 6 sections du site proposées comme filtres. Une entrée y appartient soit
// par son type d'action (ADMIN_* -> live, FAVORITE_* -> classement), soit,
// pour une simple vue de page, par le préfixe de son chemin.
const SECTIONS: { key: string; label: string; pathPrefixes: string[] }[] = [
  { key: 'tournois', label: 'Tournois', pathPrefixes: ['/tournois'] },
  { key: 'live', label: 'Live', pathPrefixes: ['/live'] },
  { key: 'classement', label: 'Classement', pathPrefixes: ['/classement', '/joueurs'] },
  { key: 'videos', label: 'Vidéos', pathPrefixes: ['/videos'] },
  { key: 'residence', label: 'Résidence', pathPrefixes: ['/render'] },
  { key: 'statistiques', label: 'Statistiques', pathPrefixes: ['/stats'] },
];

function getSection(log: ActivityLog): string | null {
  if (log.action_type.startsWith('ADMIN_')) return 'live';
  if (log.action_type.startsWith('FAVORITE_')) return 'classement';
  if (log.action_type.startsWith('PHOTO_')) return 'videos';
  if (log.action_type === 'PAGE_VIEW') {
    const path = (log.metadata?.path as string) || '';
    const section = SECTIONS.find(s => s.pathPrefixes.some(p => path.startsWith(p)));
    return section?.key ?? null;
  }
  return null;
}

export default function ActivityLogsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const [logsRes, profilesRes] = await Promise.all([
      supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('profiles').select('id, nom'),
    ]);

    if (!logsRes.error && logsRes.data) setLogs(logsRes.data);

    if (profilesRes.data) {
      const map: Record<number, string> = {};
      profilesRes.data.forEach(p => { map[p.id] = p.nom; });
      setPlayersMap(map);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => getSection(l) === filter);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-red-600 animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            Journal <span className="text-red-600">d&apos;activité</span>
          </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">
            Panel Super-Admin — {logs.length} événements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            title="Actualiser"
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={24} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => router.push('/live/super')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
            aria-label="Fermer"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <FilterChip label="Tout" active={filter === 'all'} onClick={() => setFilter('all')} />
          {SECTIONS.map(s => (
            <FilterChip key={s.key} label={s.label} active={filter === s.key} onClick={() => setFilter(s.key)} />
          ))}
        </div>

        <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
              Aucune activité
            </div>
          ) : (
            filteredLogs.map(log => {
              const isPageView = log.action_type === 'PAGE_VIEW';
              const title = isPageView ? (log.nickname || 'Inconnu') : (ACTION_LABELS[log.action_type] || log.action_type);
              const subtitle = isPageView
                ? describePageView(log.metadata, playersMap)
                : (
                  <>
                    {log.nickname || 'Inconnu'}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <span className="text-zinc-400 normal-case font-mono ml-2">
                        {formatMetadata(log.metadata, playersMap)}
                      </span>
                    )}
                  </>
                );

              return (
                <div key={log.id} className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                      <Activity size={14} className="text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm uppercase italic truncate">
                        {title}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide truncate">
                        {subtitle}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono shrink-0 text-right">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
        active ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
      }`}
    >
      {label}
    </button>
  );
}
