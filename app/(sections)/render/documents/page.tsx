'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, FileText, ExternalLink, AlignLeft } from 'lucide-react';
import { MarkdownDisplay } from '@/components/MarkdownDisplay';

type DocCategory = 'syndic' | 'fournisseurs' | 'ag' | 'pv' | 'autre';

interface DocumentRow {
  id: string;
  title: string;
  description: string | null;
  external_url: string;
  category: DocCategory;
  resume: string | null;
  created_at: string;
}

const CATEGORIES: { value: DocCategory; label: string }[] = [
  { value: 'syndic', label: 'Syndic' },
  { value: 'fournisseurs', label: 'Fournisseurs' },
  { value: 'ag', label: 'AG' },
  { value: 'pv', label: 'PV' },
  { value: 'autre', label: 'Autre' },
];

function categoryLabel(cat: DocCategory) {
  return CATEGORIES.find(c => c.value === cat?.toLowerCase())?.label || cat;
}

export default function PublicResidenceDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('residence_documents').select('id, title, description, external_url, category, resume, created_at')
      .eq('visibility', 'public').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setDocs(data); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleDocs = activeCategory === 'all' ? docs : docs.filter(d => d.category?.toLowerCase() === activeCategory);

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

        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Documents <span className="text-red-600">Résidence</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Convocations, comptes-rendus d&apos;AG, procès-verbaux...
          </p>
        </div>

        {docs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'all' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              Tous ({docs.length})
            </button>
            {CATEGORIES.filter(cat => docs.some(d => d.category?.toLowerCase() === cat.value)).map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat.value ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
              >
                {cat.label} ({docs.filter(d => d.category?.toLowerCase() === cat.value).length})
              </button>
            ))}
          </div>
        )}

        {visibleDocs.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-16 rounded-[3rem] text-center">
            <FileText className="text-zinc-400 mx-auto mb-4" size={32} />
            <p className="text-zinc-400 font-black uppercase tracking-widest">Aucun document pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
            {visibleDocs.map(doc => (
              <div key={doc.id}>
                <div className="group flex flex-wrap items-center justify-between gap-4 px-6 py-5 hover:bg-white/[0.02] transition-colors">
                  <a href={doc.external_url} target="_blank" rel="noopener noreferrer" title="Ouvre dans un nouvel onglet" className="flex items-center gap-4 min-w-0">
                    <div className="p-3 rounded-xl bg-zinc-800 text-red-600 shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm uppercase italic tracking-tight text-white truncate group-hover:text-red-500 transition-colors">{doc.title}</p>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-zinc-400 text-[9px] font-black uppercase tracking-widest">
                          {categoryLabel(doc.category)}
                        </span>
                      </div>
                      {doc.description && <p className="text-xs text-zinc-500 truncate">{doc.description}</p>}
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </a>
                  <div className="flex items-center gap-2 shrink-0">
                    {doc.resume && (
                      <button onClick={() => setExpandedId(v => v === doc.id ? null : doc.id)} title="Voir le résumé"
                        className={`p-2.5 rounded-xl transition-colors ${expandedId === doc.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
                        <AlignLeft size={16} />
                      </button>
                    )}
                    <ExternalLink size={16} className="text-zinc-500 shrink-0" />
                  </div>
                </div>
                {expandedId === doc.id && doc.resume && (
                  <div className="px-6 pb-6 bg-white/[0.01] border-t border-white/5">
                    <div className="bg-black/30 border border-white/5 rounded-2xl p-5 mt-4 [&_h1]:text-2xl [&_h2]:text-xl [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:border-0 [&_h2]:pt-0 [&_h3]:text-base [&_h3]:mt-3 [&_p]:text-sm [&_li]:text-sm">
                      <MarkdownDisplay content={doc.resume} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
