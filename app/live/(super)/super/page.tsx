"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import {
  RefreshCw,
  Globe,
  Trash2,
  Users, UserPlus,
  Settings2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Fingerprint, BookOpen, ListTodo, BarChart3, Gauge, Users2, Activity, Radio,
  KeyRound, Copy, CopyCheck, Settings, Archive, CalendarPlus, DownloadCloud
} from 'lucide-react';
import { downloadTournamentBackup } from '@/utils/download-backup';

interface ResidenceCode {
  id: string;
  label: string;
  code: string;
}

export default function AdminControlPanel() {
  const router = useRouter();
  const [status, setStatus] = useState({ loading: false, action: '' });
  const [codes, setCodes] = useState<ResidenceCode[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('residence_codes').select('id, label, code').order('label').then(({ data }) => {
      if (data) setCodes(data);
    });
  }, []);

  const copyCode = async (id: string, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // --- ACTIONS DE MAINTENANCE (API) ---
  const executeAction = async (label: string, url: string, confirmMsg: string) => {
    if (!confirm(confirmMsg)) return;
    
    setStatus({ loading: true, action: label });
    try {
      const res = await fetch(url, { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        alert(`✅ Succès : ${data.message}`);
      } else {
        alert(`❌ Erreur : ${data.error}`);
      }
    } catch (err) {
      alert("❌ Erreur réseau");
    } finally {
      setStatus({ loading: false, action: '' });
    }
  };

  // --- ACTIONS DE NAVIGATION ---
  const navTo = (path: string) => router.push(path);

  const handleBackup = async () => {
    setStatus({ loading: true, action: 'backup' });
    try {
      await downloadTournamentBackup();
    } catch (err: any) {
      alert(`❌ Erreur sauvegarde : ${err.message}`);
    } finally {
      setStatus({ loading: false, action: '' });
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 p-1">
      {/* HEADER PANEL */}
      <div className="flex items-center gap-4 mb-2 px-2">
        <div className="p-3 bg-red-600/10 rounded-2xl">
          <Fingerprint className="text-red-600" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">
            Panel <span className="text-red-600">Super Admin</span>
          </h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Contrôle système & ELO</p>
        </div>
      </div>

      {/* CODES D'ACCÈS RÉSIDENCE — visibles immédiatement, tap pour copier (optimisé iPhone) */}
      {codes.length > 0 && (
        <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6 space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
              <KeyRound size={12} /> Codes d&apos;accès résidence
            </h3>
            <button onClick={() => navTo('/render/prive/codes')} className="flex items-center gap-1 text-[9px] font-black uppercase text-zinc-600 hover:text-red-500 tracking-widest transition-colors">
              Gérer <Settings size={10} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {codes.map(c => (
              <button
                key={c.id}
                onClick={() => copyCode(c.id, c.code)}
                className="w-full flex items-center justify-between gap-3 p-5 bg-zinc-800/50 active:bg-red-600 border border-white/5 rounded-2xl transition-colors text-left"
              >
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest truncate">{c.label}</div>
                  <div className="text-2xl font-black tracking-widest font-mono text-white">{c.code}</div>
                </div>
                {copiedId === c.id ? <CopyCheck size={22} className="text-green-500 shrink-0" /> : <Copy size={22} className="text-zinc-500 shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 1 : GESTION & DONNÉES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdminNavButton 
          icon={<UserPlus size={20} />} 
          label="Gérer les Joueurs" 
          desc="Profiles & Statistiques"
          onClick={() => navTo('/live/admin_joueurs')}
        />
        <AdminNavButton 
          icon={<Gauge size={20} />} 
          label="Paramètres ELO" 
          desc="Coefficients & Seuils"
          onClick={() => navTo('/live/params_elo')}
        />
        <AdminNavButton 
          icon={<Users size={20} />} 
          label="Listes de équipes" 
          desc="Doublettes & Archives"
          onClick={() => navTo('/live/admin_teams')}
        />
        <AdminNavButton 
          icon={<BarChart3 size={20} />} 
          label="Statistiques" 
          desc="Statistiques avancées & historiques"
          onClick={() => navTo('/stats')}
        />
         <AdminNavButton 
          icon={<BookOpen size={20} />} 
          label="Charte Graphique" 
          desc="Charte graphique du projet (Markdown)"
          onClick={() => navTo('/live/charte')}
        />
        <AdminNavButton 
          icon={<ListTodo size={20} />} 
          label="Todo List" 
          desc="Todo list de la roadmap (Markdown)"
          onClick={() => navTo('/live/todo')}
        />
         <AdminNavButton 
          icon={<Users2 size={20} />} 
          label="Gestion des Accès" 
          desc="Gestion des accès et rôles des Users"
          onClick={() => navTo('/live/users')}
        />
         <AdminNavButton
          icon={<Activity size={20} />}
          label="Journal d'activité"
          desc="Actions admin & membres tracées"
          onClick={() => navTo('/live/activity')}
        />
         <AdminNavButton
          icon={<Radio size={20} />}
          label="Qui est en ligne"
          desc="Membres actifs sur la dernière heure"
          onClick={() => navTo('/live/online')}
        />
      </div>

      {/* SECTION 2 : CALCULS ELO (LOURD) */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6 space-y-4">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-2">Maintenance des scores</h3>
        
        <div className="space-y-3">
          <AdminActionButton
            icon={status.loading && status.action === 'live' ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} />}
            label="Recalculer ELO Live"
            loading={status.loading && status.action === 'live'}
            variant="warning"
            onClick={() => executeAction('live', '/api/admin/live-elo', "Recalculer tout l'historique ELO Live ?")}
          />

          <AdminActionButton
            icon={status.loading && status.action === 'all' ? <Loader2 className="animate-spin" /> : <Globe size={18} />}
            label="Recalculer ELO Origine"
            loading={status.loading && status.action === 'all'}
            variant="warning"
            onClick={() => executeAction('all', '/api/admin/recompute-elo', "Action lourde : Recalculer TOUT depuis l'origine ?")}
          />
        </div>
      </div>

      {/* SECTION 2.4 : SÉCURITÉ — sauvegarde manuelle avant toute action de fin de saison */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6 space-y-3">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-2">Sécurité</h3>
        <AdminActionButton
          icon={status.loading && status.action === 'backup' ? <Loader2 className="animate-spin" /> : <DownloadCloud size={18} />}
          label="Télécharger une sauvegarde"
          loading={status.loading && status.action === 'backup'}
          variant="warning"
          onClick={handleBackup}
        />
        <p className="text-[10px] text-zinc-500 px-2">
          Export JSON des tables live + historique (pas un backup Postgres complet). À faire avant d&apos;archiver ou de passer à la saison suivante.
        </p>
      </div>

      {/* SECTION 2.5 : FIN DE SAISON */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-6 space-y-4">
        <h3 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-2">Fin de saison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AdminNavButton
            icon={<Archive size={20} />}
            label="Archiver le tournoi"
            desc="Copie le live vers l'historique, sans rien changer au direct"
            onClick={() => navTo('/live/archive')}
          />
          <AdminNavButton
            icon={<CalendarPlus size={20} />}
            label="Saison suivante"
            desc="Active la saison suivante et réinitialise le direct"
            onClick={() => navTo('/live/next-season')}
          />
        </div>
      </div>

      {/* SECTION 3 : ZONE DE DANGER */}
      <div className="border border-red-900/20 bg-red-950/50 rounded-[2.5rem] p-6">
        <div className="flex items-center gap-3 mb-4 px-2 text-red-500">
          <AlertTriangle size={16} />
          <h3 className="text-[10px] font-black uppercase tracking-widest">Zone critique</h3>
        </div>
        
        <button
          onClick={() => navTo('/live/reset')}
          className="w-full group flex items-center justify-between p-4 bg-transparent border-2 border-red-600/30 hover:border-red-600 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl transition-all duration-300 font-bold"
        >
          <div className="flex items-center gap-3">
            <Trash2 size={20} />
            <span className="uppercase italic tracking-tighter">Reset complet du Live</span>
          </div>
          <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
        </button>
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANT : BOUTON DE NAVIGATION ---
function AdminNavButton({ icon, label, desc, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-5 bg-zinc-900/50 border border-white/5 rounded-[2rem] hover:bg-red-900 hover:border-red-600 transition-all duration-300 group text-left"
    >
      <div className="p-3 bg-zinc-800 group-hover:bg-red-600 rounded-xl text-red-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <div>
        <div className="font-bold uppercase italic tracking-tighter text-sm">{label}</div>
        <div className="text-[10px] text-zinc-500 group-hover:text-white/70 font-medium uppercase tracking-tight">{desc}</div>
      </div>
    </button>
  );
}

// --- SOUS-COMPOSANT : BOUTON D'ACTION API ---
function AdminActionButton({ icon, label, onClick, loading, variant }: any) {
  const colors = variant === 'danger' 
    ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
    : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20';

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black uppercase italic tracking-tighter text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${colors}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}