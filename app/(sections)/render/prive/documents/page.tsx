'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, Plus, FileText, Trash2, ExternalLink, Globe, Lock, AlignLeft, Check } from 'lucide-react';
import { MarkdownDisplay } from '@/components/MarkdownDisplay';

type DocCategory = 'syndic' | 'fournisseurs' | 'ag' | 'pv' | 'autre';
type Visibility = 'public' | 'private';

interface DocumentRow {
  id: string;
  title: string;
  description: string | null;
  external_url: string;
  category: DocCategory;
  visibility: Visibility;
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

export default function ResidenceDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'all'>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<DocCategory>('autre');
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resumeDraft, setResumeDraft] = useState('');
  const [savingResume, setSavingResume] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDocs() {
    setLoading(true);
    const { data } = await supabase.from('residence_documents').select('*').order('created_at', { ascending: false });
    if (data) setDocs(data);
    setLoading(false);
  }

  function isValidUrl(value: string) {
    try { new URL(value); return true; } catch { return false; }
  }

  async function handleAdd() {
    if (!title.trim() || !isValidUrl(url.trim())) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('residence_documents').insert({
      title: title.trim(),
      description: description.trim() || null,
      external_url: url.trim(),
      category,
      visibility,
      uploaded_by: user?.id ?? null,
    });
    if (!error) {
      setTitle('');
      setDescription('');
      setUrl('');
      await fetchDocs();
    }
    setSaving(false);
  }

  async function handleDelete(doc: DocumentRow) {
    if (!confirm(`Supprimer "${doc.title}" ?`)) return;
    const { error } = await supabase.from('residence_documents').delete().eq('id', doc.id);
    if (!error) await fetchDocs();
  }

  async function toggleVisibility(doc: DocumentRow) {
    const next: Visibility = doc.visibility === 'public' ? 'private' : 'public';
    const { error } = await supabase.from('residence_documents').update({ visibility: next }).eq('id', doc.id);
    if (!error) await fetchDocs();
  }

  function toggleExpand(doc: DocumentRow) {
    if (expandedId === doc.id) {
      setExpandedId(null);
    } else {
      setExpandedId(doc.id);
      setResumeDraft(doc.resume || '');
    }
  }

  async function saveResume(doc: DocumentRow) {
    setSavingResume(true);
    const { error } = await supabase.from('residence_documents').update({ resume: resumeDraft.trim() || null }).eq('id', doc.id);
    if (!error) await fetchDocs();
    setSavingResume(false);
  }

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
          <Link href="/render/prive" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Espace réservé
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Documents <span className="text-red-600">Résidence</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Convocations, comptes-rendus d&apos;AG, procès-verbaux...
          </p>
          <p className="text-zinc-600 mt-3 text-xs max-w-lg">
            Les PDF sont hébergés sur Google Drive (certains dépassent la limite de taille de notre stockage) :
            dépose le fichier dans ton Drive, partage-le ("Toute personne disposant du lien"), puis colle le lien ici.
            Un document <span className="text-emerald-500 font-bold">public</span> est visible par tous les membres
            sur <span className="text-white font-bold">/render/documents</span>, un document{' '}
            <span className="text-zinc-300 font-bold">privé</span> reste réservé aux super admins.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-8">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'all' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Tous ({docs.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat.value ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              {cat.label} ({docs.filter(d => d.category?.toLowerCase() === cat.value).length})
            </button>
          ))}
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 mb-8 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Titre du document" value={title} onChange={e => setTitle(e.target.value)}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
            <input placeholder="Description (optionnel)" value={description} onChange={e => setDescription(e.target.value)}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
          </div>
          <input placeholder="Lien Google Drive (partage : toute personne disposant du lien)" value={url} onChange={e => setUrl(e.target.value)}
            className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
          <div className="flex flex-wrap items-center gap-3">
            <select value={category} onChange={e => setCategory(e.target.value as DocCategory)}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50">
              {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
            <div className="flex items-center gap-2">
              {(['private', 'public'] as const).map(v => (
                <button key={v} type="button" onClick={() => setVisibility(v)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${visibility === v ? (v === 'public' ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-white') : 'bg-zinc-800/50 text-zinc-500 hover:text-white'}`}>
                  {v === 'public' ? <Globe size={12} /> : <Lock size={12} />} {v === 'public' ? 'Public' : 'Privé'}
                </button>
              ))}
            </div>
            <button onClick={handleAdd} disabled={saving || !title.trim() || !isValidUrl(url.trim())}
              className="ml-auto inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black uppercase tracking-widest text-[10px] px-5 py-3 rounded-xl transition-all active:scale-95">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Ajouter
            </button>
          </div>
        </div>

        {visibleDocs.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-16 rounded-[3rem] text-center">
            <FileText className="text-zinc-400 mx-auto mb-4" size={32} />
            <p className="text-zinc-400 font-black uppercase tracking-widest">Aucun document pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
            {visibleDocs.map(doc => (
              <div key={doc.id}>
                <div className="group flex items-center justify-between gap-4 px-6 py-5 hover:bg-white/[0.02] transition-colors">
                  <a href={doc.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 min-w-0">
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
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleExpand(doc)} title="Résumé (markdown)"
                      className={`p-2.5 rounded-xl transition-colors ${doc.resume ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
                      <AlignLeft size={16} />
                    </button>
                    <button onClick={() => toggleVisibility(doc)} title={doc.visibility === 'public' ? 'Public — cliquer pour rendre privé' : 'Privé — cliquer pour rendre public'}
                      className={`p-2.5 rounded-xl transition-colors ${doc.visibility === 'public' ? 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600 hover:text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
                      {doc.visibility === 'public' ? <Globe size={16} /> : <Lock size={16} />}
                    </button>
                    <a href={doc.external_url} target="_blank" rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors">
                      <ExternalLink size={16} />
                    </a>
                    <button onClick={() => handleDelete(doc)}
                      className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {expandedId === doc.id && (
                  <div className="px-6 pb-6 bg-white/[0.01] border-t border-white/5 flex flex-col gap-4">
                    <div className="flex flex-col gap-2 pt-4">
                      <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Résumé (markdown, optionnel)</span>
                      <textarea rows={5} value={resumeDraft} onChange={e => setResumeDraft(e.target.value)}
                        placeholder="## Points clés&#10;- ...&#10;- ..."
                        className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-red-600/50 resize-y" />
                      <button onClick={() => saveResume(doc)} disabled={savingResume}
                        className="self-end inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg transition-all">
                        {savingResume ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Enregistrer
                      </button>
                    </div>
                    {resumeDraft.trim() && (
                      <div className="bg-black/30 border border-white/5 rounded-2xl p-5 [&_h1]:text-2xl [&_h2]:text-xl [&_h2]:mt-4 [&_h2]:mb-2 [&_h2]:border-0 [&_h2]:pt-0 [&_h3]:text-base [&_h3]:mt-3 [&_p]:text-sm [&_li]:text-sm">
                        <MarkdownDisplay content={resumeDraft} />
                      </div>
                    )}
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
