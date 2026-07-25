'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Radio, Loader2, X, RefreshCw } from 'lucide-react';
import { describeActivity } from '@/utils/activity-format';

const ONLINE_WINDOW_MS = 60 * 60 * 1000; // 1 heure
const AUTO_REFRESH_MS = 15 * 1000;

interface OnlineUser {
  user_id: string;
  nickname: string | null;
  action_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (seconds < 60) return `il y a ${seconds}s`;
  return `il y a ${Math.floor(seconds / 60)} min`;
}

export default function OnlineUsersPage() {
  const supabase = createClient();
  const router = useRouter();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [playersMap, setPlayersMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOnline = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
    const [logsRes, profilesRes] = await Promise.all([
      supabase
        .from('activity_logs')
        .select('user_id, nickname, action_type, metadata, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, nom'),
    ]);

    if (profilesRes.data) {
      const map: Record<number, string> = {};
      profilesRes.data.forEach(p => { map[p.id] = p.nom; });
      setPlayersMap(map);
    }

    if (logsRes.data) {
      // Le plus récent par utilisateur (les lignes sont déjà triées created_at desc).
      const latestByUser = new Map<string, OnlineUser>();
      logsRes.data.forEach(row => {
        if (!latestByUser.has(row.user_id)) latestByUser.set(row.user_id, row);
      });
      setUsers(Array.from(latestByUser.values()).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }

    setLoading(false);
    setRefreshing(false);
  }, [supabase]);

  useEffect(() => {
    fetchOnline();
    const interval = setInterval(() => fetchOnline(true), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchOnline]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-red-600 animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-2xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <Radio className="text-red-600 animate-pulse" size={26} />
            Qui est <span className="text-red-600">en ligne</span>
          </h1>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
            {users.length} connecté{users.length > 1 ? 's' : ''} · actifs sur la dernière heure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOnline(true)}
            disabled={refreshing}
            title="Actualiser"
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors disabled:opacity-50"
          >
            <RefreshCw size={24} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => router.push('/live/super')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] overflow-hidden divide-y divide-white/5">
          {users.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
              Personne en ligne actuellement
            </div>
          ) : (
            users.map(u => (
              <div key={u.user_id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-bold text-sm uppercase italic truncate">
                      {u.nickname || 'Inconnu'}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide truncate">
                      {describeActivity(u.action_type, u.metadata, playersMap)}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono shrink-0">
                  {timeAgo(u.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
