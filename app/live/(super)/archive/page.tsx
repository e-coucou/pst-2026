'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Archive, AlertTriangle, Loader2, CheckCircle2, XCircle, DownloadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { downloadTournamentBackup } from '@/utils/download-backup';

interface Summary {
  status: string;
  format: string;
  teamsCount: number;
  matchesCount: number;
  unfinishedCount: number;
}

export default function ArchiveTournamentPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [confirmText, setConfirmText] = useState('');
  const [archiving, setArchiving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    fetchSummary();
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

  const fetchSummary = async () => {
    setLoadingSummary(true);
    const { data: tournoi } = await supabase.from('live_tournament').select('status, format').eq('id', 1).single();
    const { data: teams } = await supabase.from('live_teams').select('id').neq('id', 'Z');
    const { data: matches } = await supabase.from('live_matches').select('status');
    const { data: seasons } = await supabase.from('seasons').select('year').eq('is_active', true);

    if (seasons && seasons.length > 0) setYear(String(seasons[0].year));

    setSummary({
      status: tournoi?.status || 'INCONNU',
      format: tournoi?.format || 'classique',
      teamsCount: teams?.length || 0,
      matchesCount: matches?.length || 0,
      unfinishedCount: (matches || []).filter(m => m.status !== 'TERMINE').length,
    });
    setLoadingSummary(false);
  };

  const canArchive = summary?.status === 'TERMINE' && summary.unfinishedCount === 0;

  const handleArchive = async () => {
    if (confirmText !== 'ARCHIVER' || !canArchive) return;
    setArchiving(true);
    setResult(null);
    try {
      const { data, error } = await supabase.rpc('archive_tournament', { p_year: parseInt(year, 10) });
      if (error) throw error;

      // Reconstruit elo_history/history_all avec la saison qui vient d'être archivée incluse.
      const recomputeRes = await fetch('/api/admin/recompute-elo', { method: 'POST' });
      const recomputeData = await recomputeRes.json();
      if (!recomputeData.success) {
        throw new Error(`Archivage réussi mais recalcul ELO échoué : ${recomputeData.error}`);
      }

      setResult({
        ok: true,
        message: `Saison ${data.year} archivée (${data.teams_archived} équipes, ${data.games_archived} matchs). ELO recalculé.`,
      });
    } catch (err: any) {
      setResult({ ok: false, message: err.message || 'Erreur inconnue' });
    } finally {
      setArchiving(false);
    }
  };

  if (loadingSummary) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-red-600">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="bg-red-600/20 p-4 rounded-full">
            <Archive size={40} className="text-red-600" />
          </div>
          <h1 className="text-3xl font-black uppercase italic">Archiver le tournoi</h1>
          <p className="text-zinc-400 text-sm">
            Copie le tournoi live vers l&apos;historique global (<code className="text-zinc-300">teams</code>/<code className="text-zinc-300">games</code>).
            Le direct (<code className="text-zinc-300">/live</code>) continue de s&apos;afficher normalement après cette action.
          </p>
        </div>

        {/* Résumé du tournoi live */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Statut</span>
            <span className={summary?.status === 'TERMINE' ? 'text-green-500 font-bold' : 'text-orange-500 font-bold'}>{summary?.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Format</span>
            <span className="font-bold">{summary?.format}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Équipes</span>
            <span className="font-bold">{summary?.teamsCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Matchs</span>
            <span className="font-bold">
              {summary?.matchesCount}
              {summary && summary.unfinishedCount > 0 && (
                <span className="text-red-500"> ({summary.unfinishedCount} non terminés)</span>
              )}
            </span>
          </div>
        </div>

        {/* Sauvegarde optionnelle avant de continuer — archive_tournament ne supprime rien
            (copie seule), mais un export téléchargé rassure/donne un point de référence. */}
        <button
          onClick={handleBackup}
          disabled={backingUp}
          className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase text-zinc-400 hover:text-white bg-black/40 border border-white/5 px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {backingUp ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />}
          Télécharger une sauvegarde avant de continuer
        </button>

        {!canArchive && (
          <div className="flex items-start gap-3 bg-orange-950/40 border border-orange-900/40 text-orange-400 text-xs p-4 rounded-2xl">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              {summary?.status !== 'TERMINE'
                ? "Le tournoi live doit être au statut TERMINE (podium généré) avant de pouvoir être archivé."
                : "Des matchs live ne sont pas encore terminés — corrigez-les avant d'archiver."}
            </span>
          </div>
        )}

        {canArchive && !result && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 ml-1">Année à archiver</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-center font-bold tracking-widest focus:border-red-600 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2 ml-1">
                Tapez &quot;ARCHIVER&quot; pour confirmer
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
              onClick={handleArchive}
              disabled={confirmText !== 'ARCHIVER' || archiving}
              className={`w-full py-4 rounded-xl font-black uppercase italic flex items-center justify-center gap-3 transition-all ${
                confirmText === 'ARCHIVER' && !archiving
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {archiving ? <Loader2 className="animate-spin" /> : <Archive size={18} />}
              Archiver la saison {year}
            </button>
          </div>
        )}

        {result && (
          <div className={`flex items-start gap-3 text-sm p-4 rounded-2xl border ${result.ok ? 'bg-green-950/40 border-green-900/40 text-green-400' : 'bg-red-950/40 border-red-900/40 text-red-400'}`}>
            {result.ok ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <XCircle size={18} className="shrink-0 mt-0.5" />}
            <span>{result.message}</span>
          </div>
        )}

        {result?.ok && (
          <Link
            href={`/tournois/${year}`}
            className="block w-full text-center py-4 rounded-xl font-black uppercase italic bg-white text-black hover:bg-red-600 hover:text-white transition-colors"
          >
            Voir /tournois/{year}
          </Link>
        )}

        <button
          onClick={() => router.push('/live/super')}
          className="w-full text-zinc-500 font-bold text-xs uppercase hover:text-white transition-colors"
        >
          Retour
        </button>
      </div>
    </div>
  );
}
