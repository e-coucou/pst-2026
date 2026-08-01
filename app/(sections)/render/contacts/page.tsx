'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, Home, Share2 } from 'lucide-react';

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

  const url = URL.createObjectURL(new Blob([vcard], { type: 'text/vcard' }));
  window.location.href = url;
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function PublicResidenceContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [loadError, setLoadError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('residence_contacts').select('*').order('nom')
      .then(({ data, error }) => {
        if (error) { console.error(error); setLoadError(error.message); }
        else if (data) setContacts(data);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Link href="/render" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Résidence
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter">
            Contacts <span className="text-red-600">Résidence</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Conseil syndical, gardien, copropriétaires, locataires, fournisseurs
          </p>
        </div>

        {contacts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-8">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'all' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              Tous ({contacts.length})
            </button>
            {CATEGORIES.filter(cat => contacts.some(c => c.category === cat.value)).map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat.value ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
              >
                {cat.label} ({contacts.filter(c => c.category === cat.value).length})
              </button>
            ))}
          </div>
        )}

        {loadError ? (
          <div className="bg-red-950/30 border border-red-600/20 p-8 rounded-[2rem] text-center">
            <p className="text-red-500 font-black uppercase tracking-widest text-sm">Erreur de chargement</p>
            <p className="text-red-400/70 text-xs mt-2 font-mono">{loadError}</p>
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Nom</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Catégorie</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Téléphone</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Email</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Appt.</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Partager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleContacts.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Aucun contact enregistré</td></tr>
                )}
                {visibleContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
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
                      <button onClick={() => shareContact(c)} title="Partager" className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:bg-red-600 hover:text-white transition-colors">
                        <Share2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
