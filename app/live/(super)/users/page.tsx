'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ShieldCheck, User as UserIcon, Star, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Profile { id: number; nom: string; }
interface SiteUser {
  id: string;
  nickname: string;
  role: 'membre' | 'admin' | 'super';
  email: string | null;
  favoris: number | null;
  residence_access_level: number;
  last_login: string | null;
}

const RESIDENCE_LEVELS = [
  { value: 0, label: 'Aucun' },
  { value: 1, label: 'Consultation' },
  { value: 2, label: 'Avancé' },
];

export default function SuperAdminPage() {
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    // On suppose ici que le middleware a déjà validé l'accès
    const [usersRes, profilesRes] = await Promise.all([
      supabase.from('site_users').select('*').order('nickname'),
      supabase.from('profiles').select('id, nom').order('nom')
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setLoading(false);
  }

  const updateField = async (userId: string, data: Partial<SiteUser>, nickname: string) => {
    setUpdating(userId);
    const { error } = await supabase.from('site_users').update(data).eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...data } : u));
    }
    // 2. Récupération de l'admin actuel (pour le log)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const fieldName = data.role ? 'Rôle' : (data.residence_access_level !== undefined ? 'Accès Résidence' : 'Favori');
      const newValue = data.role ?? data.residence_access_level ?? data.favoris;
      await supabase.from('session_logs').insert({
        user_id: user.id, // C'est l'ID qui est autorisé par la RLS
        player_nickname: nickname, // Le nickname
        action: 'ADMIN_UPDATE_MEMBER',
        details: `Changement de ${fieldName} pour ${nickname} -> ${newValue}`
      });
    }
    setUpdating(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-red-600 animate-spin" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-red-600/30">
      {/* Header PST Style */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            Gestion <span className="text-red-600">Membres</span>
            </h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Panel Super-Admin</p>
        </div>
        <button 
          onClick={() => router.push('/live/super')}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors"
          aria-label="Fermer"
        >
          <X size={24} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-20 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Joueur</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Rôle</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Accès Résidence</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Lien Profil</th>
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Dernière Connexion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center group-hover:bg-red-600 group-hover:border-red-600/50 transition-all">
                        <UserIcon size={10} className="text-zinc-500 group-hover:text-white" />
                      </div>
                      <div>
                        <p className="font-black text-sm uppercase italic tracking-tight text-white">{user.nickname}</p>
                        <p className="text-[9px] text-zinc-400 font-bold">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-6">
                    {user.role === 'super' ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-600/20 text-red-600 text-[10px] font-black uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" /> Super
                      </span>
                    ) : (
                      <select 
                        value={user.role}
                        disabled={updating === user.id}
                        onChange={(e) => updateField(user.id, { role: e.target.value as any },user.nickname)}
                        className={`bg-zinc-800/50 border border-white/10 rounded-lg px-1 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-white/30 cursor-pointer
                          ${user.role === 'admin' ? 'text-orange-500' : 'text-purple-600'}
                        `}
                      >
                        <option value="membre">Membre</option>
                        <option value="admin">Admin</option>
                        <option value="super">Super</option>
                      </select>
                    )}
                  </td>

                  <td className="px-8 py-6">
                    {user.role === 'super' ? (
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Illimité</span>
                    ) : (
                      <select
                        value={user.residence_access_level}
                        disabled={updating === user.id}
                        onChange={(e) => updateField(user.id, { residence_access_level: parseInt(e.target.value) }, user.nickname)}
                        className={`bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-white/30 cursor-pointer ${
                          user.residence_access_level === 2 ? 'text-emerald-500' : user.residence_access_level === 1 ? 'text-blue-400' : 'text-zinc-500'
                        }`}
                      >
                        {RESIDENCE_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    )}
                  </td>

                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Star size={12} className={user.favoris ? "text-yellow-500" : "text-zinc-500"} />
                      <select
                        value={user.favoris || ''}
                        disabled={updating === user.id}
                        onChange={(e) => updateField(user.id, { favoris: e.target.value ? parseInt(e.target.value) : null }, user.nickname)}
                        className="bg-transparent border-b border-white/5 py-1 text-[11px] font-bold text-zinc-400 outline-none hover:text-white transition-colors"
                      >
                        <option value="">Aucun profil lié</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.nom}</option>
                        ))}
                      </select>
                    </div>
                  </td>

                  <td className="px-8 py-6 text-right font-mono text-[10px] text-zinc-400">
                    {user.last_login ? new Date(user.last_login).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}