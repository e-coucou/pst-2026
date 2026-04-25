'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Video, Swords, Zap, ChevronRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

export default function Home() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchJoueurs = async () => {
      // 2. On initialise le client Supabase à l'intérieur du useEffect
      const supabase = createClient();
      
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (!error) setCount(count);
    };

    fetchJoueurs();
  }, []);


  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
      
      {/* HERO SECTION */}
      <header className="relative px-6 py-20 md:py-32 max-w-7xl mx-auto text-center">
        {/* Effet de lumière rouge en arrière-plan */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-full bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Badge Saison */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 border border-red-600/30 text-white rounded-full mb-8">
          <Zap size={14} className="text-red-600 fill-red-600 animate-pulse" />
          <span className="text-[16px] font-black uppercase tracking-[0.3em]">Saison 2026</span>
        </div>
        
        {/* NOUVEAU NOM : PARIS SAINT-TROPEZ */}
        <h2 className="text-5xl md:text-8xl font-black leading-[0.8] uppercase italic tracking-tighter mb-8">
          <span className="text-white">Paris</span>
          <span className="mx-4 text-red-600 inline-block scale-150"> </span>
          <span className="text-red-600">Saint-Tropez</span>
        </h2>
        
        <p className="mt-6 text-gray-400 max-w-2xl mx-auto font-bold uppercase tracking-widest text-xs md:text-sm italic">
          Le Classement Officiel ELO de la Résidence <br className="hidden md:block" /> 
          Scores en direct • Archives Historiques • Contenus Privés
        </p>

        {/* LE COMPTEUR DE JOUEURS DYNAMIQUE */}
        <div className="mt-8 inline-flex items-center gap-3 bg-zinc-900/50 border border-white/5 px-6 py-2 rounded-2xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
             {count !== null ? `${count} athlètes inscrits` : 'Chargement du club...'}
          </span>
        </div>

        {/* GRILLE DE NAVIGATION (Avec tes effets de zoom boostés) */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          {/* BOUTON CLASSEMENT */}
          <Link href="/classement" className="group relative bg-zinc-900/50 border border-white/10 p-8 rounded-3xl hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Trophy size={80} className="text-white" />
            </div>
            <div className="bg-zinc-800 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Trophy size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Classement</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Performance ELO</p>
          </Link>

          {/* BOUTON TOURNOIS */}
          <Link href="/tournois" className="group relative bg-zinc-900/50 border border-white/10 p-8 rounded-3xl hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Swords size={80} className="text-white" />
            </div>
            <div className="bg-zinc-800 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl border border-transparent group-hover:border-white/20">
              <Swords size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Tournois</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Archives & Scores</p>
          </Link>

          {/* BOUTON VIDEOS */}
          <button className="group relative bg-zinc-900/50 border border-white/10 p-8 rounded-3xl hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Video size={80} className="text-white" />
            </div>
            <div className="bg-zinc-800 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Video size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Vidéos</h3>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Zone Membres</p>
          </button>

        </div>
      </header>

      {/* SECTION FEATURES (Style sombre & Rouge) */}
      <section className="px-6 py-24 bg-zinc-950 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          
          <div className="group">
            <div className="w-14 h-14 bg-red-600/10 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-all duration-500">
              <Users size={28} />
            </div>
            <h3 className="text-2xl font-black uppercase italic mb-3 tracking-tighter">Accès Athlètes</h3>
            <p className="text-gray-500 font-medium leading-relaxed">Espace sécurisé pour consulter vos statistiques avancées et l'évolution de votre courbe ELO.</p>
          </div>
          
          <div className="group">
            <div className="w-14 h-14 bg-red-600/10 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-all duration-500">
              <Zap size={28} />
            </div>
            <h3 className="text-2xl font-black uppercase italic mb-3 tracking-tighter">Algorithme PST</h3>
            <p className="text-gray-500 font-medium leading-relaxed">Calcul inspiré des standards internationaux pour garantir un classement équitable basé sur le mérite.</p>
          </div>

          <div className="group">
            <div className="w-14 h-14 bg-red-600/10 text-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-red-600 group-hover:text-white transition-all duration-500">
              <Video size={28} />
            </div>
            <h3 className="text-2xl font-black uppercase italic mb-3 tracking-tighter">Live & Replay</h3>
            <p className="text-gray-500 font-medium leading-relaxed">Revivez les plus beaux points des tournois grâce à notre médiathèque réservée aux licenciés.</p>
          </div>

        </div>
      </section>

      {/* FOOTER SIMPLE */}
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-[0.5em]">
          Design & Code par eCoucou Digital Engine • 2026
        </p>
      </footer>
    </div>
  );
}
