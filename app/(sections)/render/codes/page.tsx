'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, KeyRound, Copy, CopyCheck } from 'lucide-react';

interface CodeEntry {
  id: string;
  label: string;
  code: string;
  notes: string | null;
}

export default function PublicResidenceCodesPage() {
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('residence_codes').select('*').order('label')
      .then(({ data, error }) => {
        if (error) { console.error(error); setLoadError(error.message); }
        else if (data) setCodes(data);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopy(id: string, code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-red-600 animate-spin" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20">
      <div className="max-w-4xl mx-auto w-full">

        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <Link href="/render" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Résidence
          </Link>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Codes <span className="text-red-600">d&apos;Accès</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Portails, digicodes et accès communs de la résidence
          </p>
        </div>

        {loadError ? (
          <div className="bg-red-950/30 border border-red-600/20 p-8 rounded-[2rem] text-center">
            <p className="text-red-500 font-black uppercase tracking-widest text-sm">Erreur de chargement</p>
            <p className="text-red-400/70 text-xs mt-2 font-mono">{loadError}</p>
          </div>
        ) : codes.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-16 rounded-[3rem] text-center">
            <KeyRound className="text-zinc-400 mx-auto mb-4" size={32} />
            <p className="text-zinc-400 font-black uppercase tracking-widest">Aucun code enregistré.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {codes.map((c) => (
              <button key={c.id} onClick={() => handleCopy(c.id, c.code)}
                className="group bg-zinc-900/50 border border-white/5 hover:border-red-600/30 rounded-2xl p-5 flex items-center justify-between gap-4 transition-colors text-left">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate">{c.label}</p>
                  <p className="text-2xl font-black tracking-widest font-mono text-white">{c.code}</p>
                  {c.notes && <p className="text-xs text-zinc-500 mt-1">{c.notes}</p>}
                </div>
                <div className="shrink-0 p-2.5 rounded-xl bg-white/5 text-zinc-400 group-hover:bg-red-600 group-hover:text-white transition-colors">
                  {copiedId === c.id ? <CopyCheck size={16} /> : <Copy size={16} />}
                </div>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
