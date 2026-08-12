'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Search, ScrollText } from 'lucide-react';
import { MarkdownDisplay } from '@/components/MarkdownDisplay';

interface Chapter {
  id: string;
  level: number;
  title: string;
  content: string;
}

// Plage Unicode "Combining Diacritical Marks" (U+0300-U+036F) — retire les accents après
// décomposition NFD (é -> e + accent), pour une recherche/des ids insensibles aux accents.
const DIACRITICS_RANGE_START = 0x0300;
const DIACRITICS_RANGE_END = 0x036f;
function stripDiacritics(s: string) {
  return Array.from(s.normalize('NFD'))
    .filter((ch) => {
      const code = ch.codePointAt(0)!;
      return code < DIACRITICS_RANGE_START || code > DIACRITICS_RANGE_END;
    })
    .join('');
}

function slugify(s: string) {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section';
}

function foldText(s: string) {
  return stripDiacritics(s).toLowerCase();
}

// Version texte brut d'un chapitre (retire la syntaxe markdown) — utilisée pour la recherche
// et les extraits, pas pour l'affichage (qui reste rendu via MarkdownDisplay).
function toPlainText(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Découpe le markdown en chapitres sur les titres de niveau 1 et 2 (## Chapitre, # Paragraphe) —
// le document a une hiérarchie propre à ce niveau (voir en-tête du fichier source), pas besoin
// de descendre aux ### pour une table des matières lisible.
function parseChapters(md: string): Chapter[] {
  const lines = md.split('\n');
  const chapters: Chapter[] = [];
  const seen = new Map<string, number>();
  let current: { level: number; title: string; lines: string[] } | null = null;

  const finalize = (c: { level: number; title: string; lines: string[] }) => {
    // Un titre immédiatement suivi du titre suivant (aucun corps) n'apporte rien à afficher
    // séparément — cas du H1 racine du document, dont le titre est déjà repris dans l'intro.
    if (c.lines.slice(1).every((l) => l.trim() === '')) return;
    let id = slugify(c.title);
    const n = (seen.get(id) || 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    chapters.push({ id, level: c.level, title: c.title, content: c.lines.join('\n') });
  };

  for (const line of lines) {
    const m = /^(#{1,2})\s+(.*)/.exec(line);
    if (m) {
      if (current) finalize(current);
      current = { level: m[1].length, title: m[2].trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) finalize(current);
  return chapters;
}

export default function Acte1957Page() {
  const [raw, setRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/dev/acte-1957')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
        setRaw(data.content);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur inconnue'))
      .finally(() => setLoading(false));
  }, []);

  const chapters = useMemo(() => (raw ? parseChapters(raw) : []), [raw]);

  const results = useMemo(() => {
    const q = foldText(query.trim());
    if (!q) return [];
    return chapters
      .map((c) => {
        const plain = toPlainText(c.content);
        const folded = foldText(plain);
        const idx = folded.indexOf(q);
        if (idx === -1 && !foldText(c.title).includes(q)) return null;
        const start = Math.max(0, idx - 60);
        const snippet = idx === -1
          ? plain.slice(0, 140)
          : `${start > 0 ? '…' : ''}${plain.slice(start, idx + q.length + 60)}…`;
        return { chapter: c, snippet };
      })
      .filter((r): r is { chapter: Chapter; snippet: string } => r !== null);
  }, [chapters, query]);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/render/prive" className="inline-flex items-center gap-2 text-white bg-zinc-900 hover:bg-red-600 border border-white/10 hover:border-red-600 transition-all px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95">
            <ArrowLeft size={16} /> Espace réservé
          </Link>
          <h1 className="text-lg font-black uppercase italic tracking-tighter">
            Acte <span className="text-red-600">1957</span>
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="text-red-600 animate-spin" size={40} />
          </div>
        )}

        {error && (
          <div className="bg-red-600/20 border border-red-600/50 rounded-2xl p-6 flex gap-4 items-start">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <p className="text-gray-300">{error}</p>
          </div>
        )}

        {chapters.length > 0 && (
          <div className="space-y-8">

            <div className="mb-2">
              <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter">
                État Descriptif de Division <span className="text-red-600">& Règlement de Copropriété</span>
              </h2>
              <p className="text-zinc-500 mt-2 font-bold uppercase tracking-widest text-[10px]">
                Acte notarié du 15 octobre 1957 — préambule, désignation des 221 lots, règlement en 4 chapitres
              </p>
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                placeholder="Rechercher (ex: syndic, charges, article, gardien...)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-red-600/50"
              />
            </div>

            {query.trim() ? (
              <div className="bg-zinc-900/20 border border-white/5 rounded-[2rem] divide-y divide-white/5 overflow-hidden">
                {results.length === 0 ? (
                  <div className="p-10 text-center text-zinc-500 text-sm">Aucun résultat pour « {query} ».</div>
                ) : (
                  results.map(({ chapter, snippet }) => (
                    <a
                      key={chapter.id}
                      href={`#${chapter.id}`}
                      className="block px-6 py-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <p className="font-black text-xs uppercase italic tracking-tight text-red-500">{chapter.title}</p>
                      <p className="text-xs text-zinc-400 mt-1">{snippet}</p>
                    </a>
                  ))
                )}
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8">
                <h3 className="text-sm font-black uppercase tracking-widest text-red-600 mb-4 flex items-center gap-2">
                  <ScrollText size={16} /> Sommaire
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  {chapters.map((c) => (
                    <li key={c.id} className={c.level === 1 ? 'sm:col-span-2' : ''}>
                      <a
                        href={`#${c.id}`}
                        className={`transition-colors ${c.level === 1 ? 'text-white font-black uppercase tracking-wide hover:text-red-600' : 'text-zinc-400 hover:text-red-600'}`}
                      >
                        → {c.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              {chapters.map((c) => (
                <section key={c.id} id={c.id} className="scroll-mt-24">
                  <MarkdownDisplay
                    content={c.content}
                    className="[&_h1]:text-3xl [&_h1]:md:text-4xl [&_h2]:text-3xl [&_h2]:md:text-4xl [&_h2]:mt-0 [&_h2]:pt-0 [&_h2]:border-0 [&_h3]:text-lg [&_h3]:mt-6"
                  />
                </section>
              ))}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
