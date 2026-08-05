'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CalendarPlus, AlertTriangle, Loader2, XCircle, DownloadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { downloadTournamentBackup } from '@/utils/download-backup';

interface ActiveSeason {
  year: number;
  is_archived: boolean;
}

export default function NextSeasonPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState<ActiveSeason | null>(null);
  const [nextYear, setNextYear] = useState<string>('');
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    fetchActiveSeason();
  }, []);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      await downloadTournamentBackup();
    } catch (err: any) {
      alert(`Erreur sauvegarde : ${err.message}`);
    } finally {
      setBackingUp(false);
    }
  };

  const fetchActiveSeason = async () => {
    setLoading(true);
    const { data } = await supabase.from('seasons').select('year, is_archived').eq('is_active', true).single();
    if (data) {
      setActiveSeason(data);
      setNextYear(String(data.year + 1));
    }
    setLoading(false);
  };

  const canAdvance = activeSeason?.is_archived === true;

  const handleAdvance = async () => {
    if (confirmText !== 'SUIVANT' || !canAdvance) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('advance_to_next_season', { p_next_year: parseInt(nextYear, 10) });
      if (rpcError) throw rpcError;

      alert(`Saison ${nextYear} démarrée. Le direct est réinitialisé.`);
      router.push('/live/admin');
    } catch (err: any) {
      setError(err.message || 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-600">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-zinc-900 border border-red-900/50 p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="bg-red-600/20 p-4 rounded-full">
            <CalendarPlus size={40} className="text-red-600" />
          </div>
          <h1 className="text-3xl font-black uppercase italic">Saison suivante</h1>
          <p className="text-zinc-400 text-sm">
            Active la saison suivante et <strong>réinitialise le direct</strong> (équipes, matchs, sélections).
            À faire seulement quand tout le monde a fini de consulter le tournoi {activeSeason?.year}.
          </p>
        </div>

        {/* Cette action-ci vide réellement live_* (via reset_tournament) — sauvegarde fortement
            conseillée avant de continuer, même si la saison est déjà archivée côté teams/games. */}
        <button
          onClick={handleBackup}
          disabled={backingUp}
          className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase text-orange-400 hover:text-white bg-orange-950/30 border border-orange-900/40 px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {backingUp ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
          Télécharger une sauvegarde avant de continuer
        </button>

        {!canAdvance && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-orange-950/40 border border-orange-900/40 text-orange-400 text-xs p-4 rounded-2xl">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>
                La saison {activeSeason?.year} n&apos;est pas encore archivée. Archivez d&apos;abord le tournoi avant de pouvoir passer à la saison suivante.
              </span>
            </div>
            <Link
              href="/live/archive"
              className="block w-full text-center py-4 rounded-xl font-black uppercase italic bg-white text-black hover:bg-red-600 hover:text-white transition-colors"
            >
              Archiver le tournoi {activeSeason?.year}
            </Link>
          </div>
        )}

        {canAdvance && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 ml-1">Nouvelle saison active</label>
              <input
                type="number"
                value={nextYear}
                onChange={(e) => setNextYear(e.target.value)}
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-center font-bold tracking-widest focus:border-red-600 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 ml-1">
                Tapez &quot;SUIVANT&quot; pour confirmer
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-center font-bold tracking-widest focus:border-red-600 outline-none transition-colors"
                placeholder="CONFIRMATION"
              />
            </div>
            <button
              onClick={handleAdvance}
              disabled={confirmText !== 'SUIVANT' || submitting}
              className={`w-full py-4 rounded-xl font-black uppercase italic flex items-center justify-center gap-3 transition-all ${
                confirmText === 'SUIVANT' && !submitting
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {submitting ? <Loader2 className="animate-spin" /> : <CalendarPlus size={18} />}
              Démarrer la saison {nextYear}
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-900/40 text-red-400 text-sm p-4 rounded-2xl">
            <XCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={() => router.push('/live/super')}
          className="w-full text-zinc-500 font-bold text-xs uppercase hover:text-white transition-colors"
        >
          Annuler et retourner
        </button>
      </div>
    </div>
  );
}
