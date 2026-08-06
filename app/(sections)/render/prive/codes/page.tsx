'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Check, X, KeyRound, Copy, CopyCheck } from 'lucide-react';

interface CodeEntry {
  id: string;
  label: string;
  code: string;
  notes: string | null;
}

const emptyForm = { label: '', code: '', notes: '' };

export default function ResidenceCodesPage() {
  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCodes() {
    setLoading(true);
    const { data } = await supabase.from('residence_codes').select('*').order('label');
    if (data) setCodes(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!addForm.label.trim() || !addForm.code.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('residence_codes').insert({
      label: addForm.label.trim(),
      code: addForm.code.trim(),
      notes: addForm.notes.trim() || null,
    });
    if (!error) {
      setAddForm(emptyForm);
      setShowAddForm(false);
      await fetchCodes();
    }
    setSaving(false);
  }

  function startEdit(c: CodeEntry) {
    setEditingId(c.id);
    setEditForm({ label: c.label, code: c.code, notes: c.notes || '' });
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    const { error } = await supabase.from('residence_codes').update({
      label: editForm.label.trim(),
      code: editForm.code.trim(),
      notes: editForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (!error) {
      setEditingId(null);
      await fetchCodes();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce code ?')) return;
    setSaving(true);
    const { error } = await supabase.from('residence_codes').delete().eq('id', id);
    if (!error) await fetchCodes();
    setSaving(false);
  }

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
          <Link href="/render/prive" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Espace réservé
          </Link>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] px-5 py-3 rounded-xl transition-all active:scale-95"
          >
            <Plus size={14} /> Ajouter un code
          </button>
        </div>

        <div className="mb-10">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Codes <span className="text-red-600">d&apos;Accès</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Portails, digicodes et accès communs de la résidence
          </p>
        </div>

        {showAddForm && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Libellé (ex: Portail rue)" value={addForm.label} onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50 md:col-span-2" />
            <input placeholder="Code" value={addForm.code} onChange={e => setAddForm(f => ({ ...f, code: e.target.value }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50 font-mono" />
            <input placeholder="Notes" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
            <button onClick={handleAdd} disabled={saving || !addForm.label.trim() || !addForm.code.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg transition-all md:col-span-4">
              {saving ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Enregistrer'}
            </button>
          </div>
        )}

        {codes.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-16 rounded-[3rem] text-center">
            <KeyRound className="text-zinc-400 mx-auto mb-4" size={32} />
            <p className="text-zinc-400 font-black uppercase tracking-widest">Aucun code enregistré.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {codes.map((c) => editingId === c.id ? (
              <div key={c.id} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-2">
                <input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-red-600/50" />
                <input value={editForm.code} onChange={e => setEditForm(f => ({ ...f, code: e.target.value }))} className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm font-mono outline-none focus:border-red-600/50" />
                <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-red-600/50" />
                <div className="flex justify-end gap-2 mt-1">
                  <button onClick={() => handleSaveEdit(c.id)} disabled={saving} aria-label="Enregistrer la modification" className="p-2 rounded-lg bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white transition-colors"><Check size={14} /></button>
                  <button onClick={() => setEditingId(null)} aria-label="Annuler la modification" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="group bg-zinc-900/50 border border-white/5 hover:border-red-600/30 rounded-2xl p-5 flex items-center justify-between gap-4 transition-colors">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate">{c.label}</p>
                  <p className="text-2xl font-black tracking-widest font-mono text-white">{c.code}</p>
                  {c.notes && <p className="text-xs text-zinc-500 mt-1">{c.notes}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleCopy(c.id, c.code)} aria-label={copiedId === c.id ? "Code copié" : "Copier le code"} className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors">
                    {copiedId === c.id ? <CopyCheck size={16} /> : <Copy size={16} />}
                  </button>
                  <button onClick={() => startEdit(c)} aria-label="Modifier le code" className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(c.id)} aria-label="Supprimer le code" className="p-2.5 rounded-xl bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
