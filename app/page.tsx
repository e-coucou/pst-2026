'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Video, Swords, Zap, ChevronRight, Info, BarChart3, ShieldCheck, UserCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function Home() {
  const [count, setCount] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchJoueurs = async () => {
      const supabase = createClient();
      
      // Récupération du compteur de joueurs
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (!error) setCount(count);

      // Vérification de la session utilisateur pour l'affichage du bouton
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchJoueurs();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      
      {/* BARRE DE CONNEXION HAUTE */}
      <nav className="absolute top-0 right-0 p-6 z-50 flex gap-4">
        {!user ? (
          <>
            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors flex items-center gap-2">
              <UserCircle size={14} /> Connexion
            </Link>
            <Link href="/signup" className="text-[10px] font-black uppercase tracking-widest bg-red-600/10 text-red-600 px-4 py-2 rounded-full border border-red-600/20 hover:bg-red-600 hover:text-white transition-all">
              S'inscrire
            </Link>
          </>
        ) : (
          <Link href="/classement" className="text-[10px] font-black uppercase tracking-widest text-green-500 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Espace Membre Actif
          </Link>
        )}
      </nav>
      
      {/* HERO SECTION */}
      <header className="relative px-6 py-20 md:py-32 max-w-7xl mx-auto text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-full bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Badge Saison */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 border border-red-600/30 text-white rounded-full mb-8">
          <Zap size={14} className="text-red-600 fill-red-600 animate-pulse" />
          <span className="text-[16px] font-black uppercase tracking-[0.3em]">Saison 2026</span>
        </div>
        
        <h2 className="text-5xl md:text-8xl font-black leading-[0.8] uppercase italic tracking-tighter mb-8">
          <span className="text-white">Paris</span>
          <span className="mx-4 text-red-600 inline-block scale-150"> </span>
          <span className="text-red-600">Saint-Tropez</span>
        </h2>
        
        <p className="mt-6 text-gray-400 max-w-2xl mx-auto font-bold uppercase tracking-widest text-xs md:text-sm italic">
          Le Classement Officiel ELO de la Résidence <br className="hidden md:block" /> 
          Archives Historiques • Vidéos Privées • Esprit Club
        </p>

        {/* COMPTEUR */}
        <div className="mt-8 inline-flex items-center gap-3 bg-zinc-900/50 border border-white/5 px-6 py-2 rounded-2xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
             {count !== null ? `${count} athlètes inscrits` : 'Chargement du club...'}
          </span>
        </div>

        {/* GRILLE DE NAVIGATION PRINCIPALE */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">
          <Link href="/classement" className="group relative bg-zinc-900/50 border border-white/10 p-8 rounded-3xl hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
            <div className="bg-zinc-800 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Trophy size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Classement</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Performance ELO</p>
          </Link>

          <Link href="/tournois" className="group relative bg-zinc-900/50 border border-white/10 p-8 rounded-3xl hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
            <div className="bg-zinc-800 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Swords size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Tournois</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Archives & Scores</p>
          </Link>

          <Link href="/videos" className="group relative bg-zinc-900/50 border border-white/10 p-8 rounded-3xl hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
            <div className="bg-zinc-800 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Video size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Vidéos</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Zone Membres</p>
          </Link>
        </div>
      </header>

      {/* SECTION MARKETING / INFO */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/concept" className="group bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem] hover:border-red-600/50 transition-all">
            <div className="bg-red-600/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-red-600">
              <Info size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white mb-2">Le Concept</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-4">L'organisation des poules et la route vers la grande finale.</p>
            <div className="flex items-center gap-2 text-red-600 font-black text-[10px] uppercase tracking-widest">
              Règlement <ChevronRight size={14} />
            </div>
          </Link>

          <Link href="/regles-elo" className="group bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem] hover:border-purple-600/50 transition-all">
            <div className="bg-purple-600/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-purple-600">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white mb-2">L'Algorithme</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-4">Comprendre le calcul ELO Classic vs Modern.</p>
            <div className="flex items-center gap-2 text-purple-600 font-black text-[10px] uppercase tracking-widest">
              Détails techniques <ChevronRight size={14} />
            </div>
          </Link>

          <Link href="/about" className="group bg-zinc-900/30 border border-white/5 p-8 rounded-[2.5rem] hover:border-zinc-500 transition-all">
            <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-zinc-400">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white mb-2">L'Esprit</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-4">Un projet entre amis pour pimenter nos étés.</p>
            <div className="flex items-center gap-2 text-zinc-400 font-black text-[10px] uppercase tracking-widest">
              À propos <ChevronRight size={14} />
            </div>
          </Link>
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">
          Design & Code par eCoucou Digital Engine • 2026
        </p>
      </footer>
    </div>
  );
}
