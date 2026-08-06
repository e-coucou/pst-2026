'use client';

import { useState } from 'react';
import { Share2, Download, X, Loader2 } from 'lucide-react';

export default function ShareMatchButton({ gameId, className }: { gameId: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const imageUrl = `/api/card/match/${gameId}`;

  const handleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], `pst-match-${gameId}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Résultat PST' });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pst-match-${gameId}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className={className ?? 'p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-red-600 hover:bg-red-600/10 transition-all'}
        title="Partager ce résultat"
        aria-label="Partager ce résultat"
      >
        <Share2 size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-white/10 p-6 rounded-3xl w-full max-w-2xl relative shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl" />

            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Carte de résultat</h3>

            <img src={imageUrl} alt="Carte de résultat du match" className="w-full rounded-2xl border border-white/5 mb-4" />

            <button
              onClick={handleShare}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              {loading ? 'Préparation...' : 'Partager / Télécharger'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
