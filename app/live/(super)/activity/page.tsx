'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Activity, Loader2, X } from 'lucide-react';

interface ActivityLog {
  id: number;
  user_id: string;
  nickname: string | null;
  action_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  ADMIN_SELECT_PLAYER: 'Sélection joueur',
  ADMIN_REMOVE_PLAYER: 'Retrait joueur',
  ADMIN_TOGGLE_CONFIRMED: 'Confirmation joueur',
  ADMIN_FINALIZE_TEAMS: 'Constitution des équipes',
  ADMIN_SHUFFLE_TEAMS: 'Mélange des équipes',
  ADMIN_START_TOURNAMENT: 'Lancement du tournoi',
  ADMIN_SAVE_SCORE: 'Saisie de score',
  ADMIN_UNLOCK_MATCH: 'Déverrouillage de match',
  ADMIN_GENERATE_DEMIS: 'Génération des demis',
  ADMIN_GENERATE_FINALS: 'Génération des finales',
  ADMIN_COMPLETE_TOURNAMENT: 'Fin du tournoi',
  FAVORITE_SET: 'Ajout favori',
  FAVORITE_UNSET: 'Retrait favori',
};

export default function ActivityLogsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setLogs(data);
    setLoading(false);
  };

  const actionTypes = Array.from(new Set(logs.map(l => l.action_type))).sort();
  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.action_type === filter);

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
        <button
          onClick={() => router.push('/live/super')}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <FilterChip label="Tout" active={filter === 'all'} onClick={() => setFilter('all')} />
          {actionTypes.map(t => (
            <FilterChip key={t} label={ACTION_LABELS[t] || t} active={filter === t} onClick={() => setFilter(t)} />
          ))}
        </div>

        <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">
              Aucune activité
            </div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                    <Activity size={14} className="text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm uppercase italic truncate">
                      {ACTION_LABELS[log.action_type] || log.action_type}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide truncate">
                      {log.nickname || 'Inconnu'}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <span className="text-zinc-700 normal-case font-mono ml-2">
                          {Object.entries(log.metadata).map(([k, v]) => `${k}=${v}`).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono shrink-0 text-right">
                  {new Date(log.created_at).toLocaleString('fr-FR')}
                </div>
              </div>
            ))
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
