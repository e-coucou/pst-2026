'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, Plus, Pencil, Trash2, Check, X, Home, Share2 } from 'lucide-react';

type Category = 'conseil_syndical' | 'gardien' | 'coproprietaire' | 'locataire' | 'fournisseur';

interface Contact {
  id: string;
  category: Category;
  nom: string;
  contrat: string | null;
  telephone: string | null;
  email: string | null;
  apartment_num: string | null;
  notes: string | null;
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'conseil_syndical', label: 'Conseil Syndical' },
  { value: 'gardien', label: 'Gardien' },
  { value: 'coproprietaire', label: 'Copropriétaire' },
  { value: 'locataire', label: 'Locataire' },
  { value: 'fournisseur', label: 'Fournisseur' },
];

const CATEGORY_STYLES: Record<Category, string> = {
  conseil_syndical: 'bg-red-600/10 border-red-600/20 text-red-500',
  gardien: 'bg-blue-600/10 border-blue-600/20 text-blue-400',
  coproprietaire: 'bg-purple-600/10 border-purple-600/20 text-purple-400',
  locataire: 'bg-amber-600/10 border-amber-600/20 text-amber-400',
  fournisseur: 'bg-emerald-600/10 border-emerald-600/20 text-emerald-400',
};

function categoryLabel(cat: Category) {
  return CATEGORIES.find(c => c.value === cat)?.label || cat;
}

function vcardEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function buildVCard(c: Contact) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${vcardEscape(c.nom)}`, `ORG:${vcardEscape(categoryLabel(c.category))}`];
  if (c.telephone) lines.push(`TEL;TYPE=CELL:${c.telephone.replace(/[^\d+]/g, '')}`);
  if (c.email) lines.push(`EMAIL:${c.email}`);
  const noteParts = [c.contrat, c.notes].filter(Boolean) as string[];
  if (noteParts.length) lines.push(`NOTE:${vcardEscape(noteParts.join(' — '))}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

async function shareContact(c: Contact) {
  const vcard = buildVCard(c);
  const fileName = `${c.nom.replace(/[^\w-]+/g, '_')}.vcf`;
  const file = new File([vcard], fileName, { type: 'text/vcard' });

  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean; share?: (data: { files: File[]; title: string }) => Promise<void> };
  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({ files: [file], title: c.nom });
      return;
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
    }
  }

  // Fallback (pas de Web Share API, ex: desktop) : navigation directe pour laisser
  // le navigateur proposer l'ouverture/import du .vcf.
  const url = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard' }));
  window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const emptyForm = { category: 'conseil_syndical' as Category, nom: '', contrat: '', telephone: '', email: '', apartment_num: '', notes: '' };

export default function ResidenceContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const supabase = createClient();

  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchContacts() {
    setLoading(true);
    const { data } = await supabase.from('residence_contacts').select('*').order('nom');
    if (data) setContacts(data);
    setLoading(false);
  }

  async function handleAdd() {
    if (!addForm.nom.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('residence_contacts').insert({
      category: addForm.category,
      nom: addForm.nom.trim(),
      contrat: addForm.contrat.trim() || null,
      telephone: addForm.telephone.trim() || null,
      email: addForm.email.trim() || null,
      apartment_num: addForm.apartment_num.trim() || null,
      notes: addForm.notes.trim() || null,
    });
    if (!error) {
      setAddForm({ ...emptyForm, category: addForm.category });
      setShowAddForm(false);
      await fetchContacts();
    }
    setSaving(false);
  }

  function startEdit(c: Contact) {
    setEditingId(c.id);
    setEditForm({
      category: c.category,
      nom: c.nom,
      contrat: c.contrat || '',
      telephone: c.telephone || '',
      email: c.email || '',
      apartment_num: c.apartment_num || '',
      notes: c.notes || '',
    });
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    const { error } = await supabase.from('residence_contacts').update({
      category: editForm.category,
      nom: editForm.nom.trim(),
      contrat: editForm.contrat.trim() || null,
      telephone: editForm.telephone.trim() || null,
      email: editForm.email.trim() || null,
      apartment_num: editForm.apartment_num.trim() || null,
      notes: editForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (!error) {
      setEditingId(null);
      await fetchContacts();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce contact ?')) return;
    setSaving(true);
    const { error } = await supabase.from('residence_contacts').delete().eq('id', id);
    if (!error) await fetchContacts();
    setSaving(false);
  }

  const visibleContacts = activeCategory === 'all' ? contacts : contacts.filter(c => c.category === activeCategory);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-red-600 animate-spin" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-20">
      <div className="max-w-5xl mx-auto w-full">

        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <Link href="/render/prive" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Espace réservé
          </Link>
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[10px] px-5 py-3 rounded-xl transition-all active:scale-95"
          >
            <Plus size={14} /> Ajouter un contact
          </button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Contacts <span className="text-red-600">Résidence</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Conseil syndical, gardien, copropriétaires, locataires, fournisseurs
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-8">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'all' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Tous ({contacts.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat.value ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              {cat.label} ({contacts.filter(c => c.category === cat.value).length})
            </button>
          ))}
        </div>

        {showAddForm && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 mb-8 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value as Category }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50 md:col-span-2">
              {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
            </select>
            <input placeholder="Nom" value={addForm.nom} onChange={e => setAddForm(f => ({ ...f, nom: e.target.value }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50 md:col-span-3" />
            {addForm.category === 'fournisseur' && (
              <input placeholder="Contrat / prestation" value={addForm.contrat} onChange={e => setAddForm(f => ({ ...f, contrat: e.target.value }))}
                className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50 md:col-span-5" />
            )}
            <input placeholder="Téléphone" value={addForm.telephone} onChange={e => setAddForm(f => ({ ...f, telephone: e.target.value }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
            <input placeholder="Email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
            <input placeholder="N° appartement" value={addForm.apartment_num} onChange={e => setAddForm(f => ({ ...f, apartment_num: e.target.value }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50" />
            <input placeholder="Notes" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-600/50 md:col-span-2" />
            <button onClick={handleAdd} disabled={saving || !addForm.nom.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-lg transition-all">
              {saving ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Enregistrer'}
            </button>
          </div>
        )}

        <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Nom</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Catégorie</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Téléphone</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Email</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Appt.</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visibleContacts.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Aucun contact enregistré</td></tr>
              )}
              {visibleContacts.map((c) => editingId === c.id ? (
                <tr key={c.id} className="bg-white/[0.02]">
                  <td className="px-4 py-4 min-w-[10rem]">
                    <input value={editForm.nom} onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))} className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm w-full outline-none focus:border-red-600/50" />
                    {editForm.category === 'fournisseur' && (
                      <input placeholder="Contrat / prestation" value={editForm.contrat} onChange={e => setEditForm(f => ({ ...f, contrat: e.target.value }))} className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs w-full outline-none focus:border-red-600/50 mt-1.5" />
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value as Category }))}
                      className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-red-600/50">
                      {CATEGORIES.map(cat => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-4"><input value={editForm.telephone} onChange={e => setEditForm(f => ({ ...f, telephone: e.target.value }))} className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm w-full outline-none focus:border-red-600/50" /></td>
                  <td className="px-4 py-4"><input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm w-full outline-none focus:border-red-600/50" /></td>
                  <td className="px-4 py-4"><input value={editForm.apartment_num} onChange={e => setEditForm(f => ({ ...f, apartment_num: e.target.value }))} className="bg-zinc-800/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm w-20 outline-none focus:border-red-600/50" /></td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleSaveEdit(c.id)} disabled={saving} aria-label="Enregistrer la modification" className="p-2 rounded-lg bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white transition-colors"><Check size={14} /></button>
                      <button onClick={() => setEditingId(null)} aria-label="Annuler la modification" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 transition-colors"><X size={14} /></button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5">
                    <div className="font-black text-sm uppercase italic tracking-tight text-white">{c.nom}</div>
                    {c.contrat && <div className="text-[10px] text-zinc-500 normal-case font-medium mt-0.5 max-w-xs">{c.contrat}</div>}
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${CATEGORY_STYLES[c.category]}`}>
                      {categoryLabel(c.category)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-mono">
                    {c.telephone ? (
                      <a href={`tel:${c.telephone.replace(/[^\d+]/g, '')}`} className="text-zinc-300 hover:text-red-500 transition-colors">{c.telephone}</a>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-5 text-sm">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="text-zinc-300 hover:text-red-500 transition-colors">{c.email}</a>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-5">
                    {c.apartment_num ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-800/80 border border-white/10 text-zinc-300 text-[10px] font-black uppercase tracking-widest">
                        <Home size={10} /> {c.apartment_num}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => shareContact(c)} title="Partager" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors"><Share2 size={14} /></button>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(c)} aria-label="Modifier le contact" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(c.id)} aria-label="Supprimer le contact" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
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
