'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, AlertCircle, Loader } from 'lucide-react';
import { MarkdownDisplay } from '@/components/MarkdownDisplay';

export default function ChartePage() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharte = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/dev/charte');
        
        if (!res.ok) {
          throw new Error(`Erreur ${res.status}: Impossible de charger la charte`);
        }

        const data = await res.json();
        setContent(data.content);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        console.error('Erreur lors du chargement de la charte:', message);
        setError(message);
        setContent(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCharte();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Retour
          </Link>
          
          <h1 className="text-2xl font-black uppercase italic tracking-tighter">
            <span className="text-white">Charte</span> <span className="text-red-600">Graphique</span>
          </h1>

          <div className="w-[60px]" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        
        {/* ÉTAT : CHARGEMENT */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 rounded-full bg-red-600/10 border border-red-600/30 animate-pulse">
              <Loader size={32} className="text-red-600 animate-spin" />
            </div>
            <p className="text-gray-400 uppercase font-black text-sm tracking-widest">
              Chargement de la charte...
            </p>
          </div>
        )}

        {/* ÉTAT : ERREUR */}
        {error && (
          <div className="bg-red-600/20 border border-red-600/50 rounded-2xl p-6 flex gap-4 items-start">
            <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-red-600 mb-2">
                Erreur de chargement
              </h2>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setContent(null);
                  // Retry logic (peut être amélioré avec une vraie fonction)
                  window.location.reload();
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg 
                           font-black text-xs uppercase tracking-widest transition-colors"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {/* ÉTAT : CONTENU CHARGÉ */}
        {content && (
          <div className="space-y-8">
            {/* Table des matières rapide */}
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-8 sticky top-20 z-30">
              <h2 className="text-sm font-black uppercase tracking-widest text-red-600 mb-4">
                Navigation rapide
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <li>
                  <a href="#vue-densemble" className="text-gray-400 hover:text-red-600 transition-colors">
                    → Vue d'ensemble
                  </a>
                </li>
                <li>
                  <a href="#palette-de-couleurs" className="text-gray-400 hover:text-red-600 transition-colors">
                    → Palette de couleurs
                  </a>
                </li>
                <li>
                  <a href="#typographie" className="text-gray-400 hover:text-red-600 transition-colors">
                    → Typographie
                  </a>
                </li>
                <li>
                  <a href="#structure--layouts" className="text-gray-400 hover:text-red-600 transition-colors">
                    → Structure & Layouts
                  </a>
                </li>
                <li>
                  <a href="#animations--transitions" className="text-gray-400 hover:text-red-600 transition-colors">
                    → Animations
                  </a>
                </li>
                <li>
                  <a href="#responsive-design" className="text-gray-400 hover:text-red-600 transition-colors">
                    → Responsive
                  </a>
                </li>
                <li>
                  <a href="#configuration-tailwind" className="text-gray-400 hover:text-red-600 transition-colors">
                    → Config Tailwind
                  </a>
                </li>
                <li>
                  <a href="#accessibilité" className="text-gray-400 hover:text-red-600 transition-colors">
                    → Accessibilité
                  </a>
                </li>
              </ul>
            </div>

            {/* Contenu markdown */}
            <MarkdownDisplay 
              content={content}
              className="prose-headings:scroll-mt-24"
            />

            {/* Footer CTA */}
            <div className="mt-16 pt-8 border-t border-white/10">
              <div className="bg-zinc-800/50 border border-red-600/30 rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-4">
                  Besoin de précisions ?
                </h3>
                <p className="text-gray-400 mb-6">
                  Consulte la documentation complète ou pose ta question à l'équipe design.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link
                    href="/concept"
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black 
                             uppercase text-xs tracking-widest rounded-lg transition-colors"
                  >
                    → En savoir plus
                  </Link>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-black 
                             uppercase text-xs tracking-widest rounded-lg transition-colors"
                  >
                    ← Retour accueil
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/5 mt-20 py-8 text-center text-xs text-gray-500 uppercase tracking-widest font-bold">
        <p>Paris Saint-Tropez 2026 — Charte Graphique Officielle v1.0</p>
      </footer>
    </div>
  );
}
