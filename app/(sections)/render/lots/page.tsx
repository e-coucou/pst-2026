'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Loader2, Search, Home, Boxes, Warehouse, DoorClosed, Archive, Layers, Box as BoxIcon, Building2 } from 'lucide-react';

type Categorie = 'studio' | 'appartement' | 'box' | 'cave' | 'chambre_de_bonne' | 'placard' | 'partie_commune';
type Batiment = 'A' | 'B';

interface Lot {
  id: string;
  numero_lot: number | null;
  identifiant_local: string;
  categorie: Categorie;
  batiment: Batiment;
  etage: string | null;
  secteur: string | null;
  orientation: string | null;
  situation: string | null;
  composition: string[] | null;
  tantieme_numerateur: number | null;
  tantieme_denominateur: number | null;
  tantieme_texte_original: string | null;
  description: string | null;
  observation: string | null;
  plan_kind: string | null;
  plan_num: string | null;
}

const CATEGORIES: { value: Categorie; label: string; icon: React.ReactNode }[] = [
  { value: 'studio', label: 'Studio', icon: <Home size={12} /> },
  { value: 'appartement', label: 'Appartement', icon: <Boxes size={12} /> },
  { value: 'box', label: 'Box', icon: <Warehouse size={12} /> },
  { value: 'cave', label: 'Cave', icon: <Archive size={12} /> },
  { value: 'chambre_de_bonne', label: 'Chambre de bonne', icon: <DoorClosed size={12} /> },
  { value: 'placard', label: 'Placard', icon: <BoxIcon size={12} /> },
  { value: 'partie_commune', label: 'Partie commune', icon: <Building2 size={12} /> },
];

const CATEGORY_STYLES: Record<Categorie, string> = {
  studio: 'bg-blue-600/10 border-blue-600/20 text-blue-400',
  appartement: 'bg-red-600/10 border-red-600/20 text-red-500',
  box: 'bg-purple-600/10 border-purple-600/20 text-purple-400',
  cave: 'bg-zinc-600/20 border-zinc-500/20 text-zinc-400',
  chambre_de_bonne: 'bg-amber-600/10 border-amber-600/20 text-amber-400',
  placard: 'bg-emerald-600/10 border-emerald-600/20 text-emerald-400',
  partie_commune: 'bg-cyan-600/10 border-cyan-600/20 text-cyan-400',
};

function categoryLabel(cat: Categorie) {
  return CATEGORIES.find(c => c.value === cat)?.label || cat;
}

export default function ResidenceLotsPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeBatiment, setActiveBatiment] = useState<Batiment | 'all'>('all');
  const [activeCategory, setActiveCategory] = useState<Categorie | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('residence_lots').select('*').order('numero_lot')
      .then(({ data, error }) => {
        if (error) { console.error(error); setLoadError(error.message); }
        else if (data) setLots(data);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = search.trim().toLowerCase();
  const lotsInBatiment = activeBatiment === 'all' ? lots : lots.filter(l => l.batiment === activeBatiment);
  const visibleLots = lotsInBatiment
    .filter(l => activeCategory === 'all' || l.categorie === activeCategory)
    .filter(l => !q || l.identifiant_local.toLowerCase().includes(q) || String(l.numero_lot ?? '').includes(q));

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
            Lots <span className="text-red-600">Résidence</span>
          </h1>
          <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
            Fiche signalétique complète — état descriptif de division (acte notarié)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          {(['all', 'A', 'B'] as const).map(b => (
            <button
              key={b}
              onClick={() => setActiveBatiment(b)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeBatiment === b ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              {b === 'all' ? `Tous les bâtiments (${lots.length})` : `Bâtiment ${b} (${lots.filter(l => l.batiment === b).length})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'all' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            Tous ({lotsInBatiment.length})
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === cat.value ? 'bg-red-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
            >
              {cat.icon} {cat.label} ({lotsInBatiment.filter(l => l.categorie === cat.value).length})
            </button>
          ))}
        </div>

        <div className="relative mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input placeholder="Rechercher (ex: B12, A1, Box 11, 66...)" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-red-600/50" />
        </div>

        {loadError ? (
          <div className="bg-red-950/30 border border-red-600/20 p-8 rounded-[2rem] text-center">
            <p className="text-red-500 font-black uppercase tracking-widest text-sm">Erreur de chargement</p>
            <p className="text-red-400/70 text-xs mt-2 font-mono">{loadError}</p>
          </div>
        ) : visibleLots.length === 0 ? (
          <div className="bg-zinc-900/50 border border-white/5 p-16 rounded-[3rem] text-center">
            <Layers className="text-zinc-400 mx-auto mb-4" size={32} />
            <p className="text-zinc-400 font-black uppercase tracking-widest">Aucun lot trouvé.</p>
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
            {visibleLots.map(lot => (
              <div key={lot.id}>
                <button onClick={() => setExpandedId(v => v === lot.id ? null : lot.id)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    {activeBatiment === 'all' && (
                      <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded bg-white/10 text-white text-[10px] font-black">{lot.batiment}</span>
                    )}
                    <span className="font-black text-sm text-white font-mono w-8 shrink-0">{lot.numero_lot ?? '—'}</span>
                    <span className="font-black text-sm uppercase italic tracking-tight text-white truncate">{lot.identifiant_local}</span>
                    <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${CATEGORY_STYLES[lot.categorie]}`}>
                      {categoryLabel(lot.categorie)}
                    </span>
                    {lot.plan_kind && (
                      <span className="hidden sm:inline shrink-0 text-[9px] font-bold uppercase tracking-widest text-zinc-500">sur le plan 3D</span>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{lot.etage}</span>
                </button>
                {expandedId === lot.id && (
                  <div className="px-6 pb-6 bg-white/[0.01] border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div>
                      <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2">Situation</p>
                      <p className="text-sm text-zinc-300">{lot.situation}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {lot.etage && <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-md">{lot.etage}</span>}
                        {lot.secteur && <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-md">Secteur {lot.secteur}</span>}
                        {lot.orientation && <span className="px-2 py-1 bg-zinc-800/80 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-md">Orientation {lot.orientation}</span>}
                      </div>
                      {lot.observation && (
                        <p className="text-xs text-amber-400/80 mt-3 italic">{lot.observation}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-2">Composition</p>
                      {lot.composition && lot.composition.length > 0 ? (
                        <ul className="text-sm text-zinc-300 space-y-1 mb-4">
                          {lot.composition.map((piece, i) => <li key={i}>• {piece}</li>)}
                        </ul>
                      ) : <p className="text-sm text-zinc-500 mb-4">—</p>}
                      {lot.tantieme_numerateur != null && (
                        <>
                          <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1">Tantièmes</p>
                          <p className="text-sm text-zinc-300 font-mono">{lot.tantieme_numerateur}/{lot.tantieme_denominateur}</p>
                          {lot.tantieme_texte_original && <p className="text-[10px] text-zinc-500 italic">{lot.tantieme_texte_original}</p>}
                        </>
                      )}
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
