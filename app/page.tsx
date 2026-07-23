'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Video, Swords, Zap, ChevronRight, Info, BarChart3, ShieldCheck, UserCircle, Gauge, AlertTriangle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

// Date du tournoi — le message d'annonce de la home s'adapte automatiquement autour de ce jour
const EVENT_DATE = new Date(2026, 7, 4); // Mardi 4 Août 2026 (mois 0-indexé)

export default function Home() {
  const [count, setCount] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [season, setSeason] = useState<any[]>([2026]); // Saison actuelle
  const [status, setStatus] = useState<string>('TERMINE');
  const [confirmStats, setConfirmStats] = useState<{ total: number; confirmed: number } | null>(null);

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

      const { data: seasons } = await supabase.from('seasons').select('year, is_active');
      if (seasons) {
        setSeason(seasons.filter(m => m.is_active === true))
      }

      const { data: tournoi } = await supabase.from('live_tournament').select('status').eq('id', 1).single();
	    if (tournoi) {
	      setStatus(tournoi?.status);
	    }

      // Le jour J uniquement : qui a validé sa présence ?
      const isEventDay = new Date().toDateString() === EVENT_DATE.toDateString();
      if (isEventDay) {
        const { data: selected } = await supabase
          .from('live_selected')
          .select('confirmed')
          .not('role', 'is', null);
        if (selected) {
          setConfirmStats({ total: selected.length, confirmed: selected.filter(s => s.confirmed).length });
        }
      }

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
      
      {/*' HERO SECTION */}
      <header className="relative px-6 py-20 md:py-32 max-w-7xl mx-auto text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-full bg-red-600/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Badge Saison */}
        <Link href="/live">
          <div className="flex justify-center w-full"> {/* Conteneur parent pour centrer le badge dans la page */}
            
            <div className="w-fit flex items-center bg-zinc-900 border border-red-600/30 text-white rounded-full px-5 py-2 mb-8 hover:bg-zinc-800 transition-all group">
              
              {/* 1. L'Eclair (Zap) fixé à gauche */}
              <div className="flex-shrink-0 mr-4">
                <Zap size={18} className="text-red-600 fill-red-600 animate-pulse" />
              </div>

              {/* 2. Le Texte centré verticalement et horizontalement au milieu du reste de l'espace */}
              <div className="flex flex-col items-center pr-4"> 
                <div className="leading-tight">
                  <span className="text-lg font-black uppercase tracking-[0.2em]">
                    Saison {season[0].year}
                  </span>
                </div>

                {(() => {
                  const now = new Date();
                  const isEventDay = now.toDateString() === EVENT_DATE.toDateString();
                  const isPastEvent = now.getTime() > EVENT_DATE.getTime() && !isEventDay;

                  // Après le jour J : le message disparaît, place au statut live ci-dessous
                  if (isPastEvent) return null;

                  // Avant le jour J : annonce, avec la date bien mise en avant
                  if (!isEventDay) {
                    return (
                      <div className="my-1 text-center">
                        <div className="text-red-600 text-2xl md:text-3xl font-black uppercase italic tracking-tight leading-none">
                          Mardi 4 Août
                        </div>
                        <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1 max-w-[220px] sm:max-w-none mx-auto">
                          Terrain de Boules • RDV 18h00 précises <span className="text-white">(Tirage des Équipes)</span>
                        </div>
                      </div>
                    );
                  }

                  // Jour J, tout le monde n'a pas encore validé : rappel
                  if (confirmStats && confirmStats.confirmed < confirmStats.total) {
                    const manquants = confirmStats.total - confirmStats.confirmed;
                    return (
                      <div className="my-1 flex flex-col items-center gap-1 max-w-[240px] sm:max-w-none mx-auto">
                        <div className="flex items-center gap-2 text-orange-500 text-xs font-black uppercase tracking-widest">
                          <AlertTriangle size={14} className="animate-pulse" />
                          {manquants} joueur{manquants > 1 ? 's' : ''} pas encore confirmé{manquants > 1 ? 's' : ''}
                        </div>
                        <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest text-center">
                          Terrain de Boules • RDV 18h00 précises <span className="text-white">(Tirage des Équipes)</span>
                        </div>
                      </div>
                    );
                  }

                  // Jour J, tout le monde a validé : programme (un peu) sérieux de la journée
                  return (
                    <div className="my-1 flex flex-col items-center gap-0.5 text-center max-w-[260px] sm:max-w-none mx-auto">
                      <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                        Jusqu'à midi <span className="text-white">préparez-vous</span>
                      </span>
                      <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                        Midi – 14h <span className="text-white">repas léger et sobre</span> 😉
                      </span>
                      <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                        14h – 16h <span className="text-white">petite sieste...</span>
                      </span>
                      <span className="text-red-600 text-xs font-black uppercase tracking-widest mt-1">
                        RDV 18h00 précises, terrain de boules !
                      </span>
                    </div>
                  );
                })()}

                <div className="flex items-center">
                  <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                    EN DIRECT :&nbsp;
                  </span>
                  <span className="text-red-600 text-xl font-bold uppercase tracking-widest animate-pulse">
                    {status}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </Link>
        
        <h2 className="group relative text-5xl md:text-8xl font-black leading-[0.8] uppercase italic tracking-tighter mb-8">
          <span className="text-white group-hover:text-red-600">Paris</span>
          <span className="mx-4 text-red-600 inline-block scale-150"> </span>
          <span className="text-red-600 group-hover:text-white">Saint-Tropez</span>
        </h2>
        
        <p className="mt-6 text-gray-400 max-w-2xl mx-auto font-bold uppercase tracking-widest text-xs md:text-sm italic">
          Le Tournoi Officiel de Pétanque • Résidence Paris St-Tropez •&nbsp;<br className="hidden md:block" /> 
          Archives Historiques • Vidéos Privées • Esprit du Tournoi
        </p>

        {/* COMPTEUR */}
        <div className="mt-8 inline-flex items-center gap-3 bg-zinc-800/50 border border-white/50 hover:bg-zinc-800 px-6 py-2 rounded-2xl">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
             {count !== null ? `${count} athlètes inscrits` : 'Chargement du club...'}
          </span>
        </div>

        {/* GRILLE DE NAVIGATION PRINCIPALE */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto px-4">

          <Link href="/tournois" className="group relative bg-zinc-800/50 border border-white/10 p-8 rounded-3xl hover:bg-red-900  hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
            <div className="bg-zinc-700 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Swords size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Tournois</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Archives & Scores</p>
          </Link>

          <Link href="/videos" className="group relative bg-zinc-800/50 border border-white/10 p-8 rounded-3xl hover:bg-red-900  hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
            <div className="bg-zinc-700 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Video size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white mb-2">Vidéos</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Zone Membres</p>
          </Link>

          <Link href="/classement" className="group relative bg-zinc-800/50 border border-white/10 p-8 rounded-3xl hover:bg-red-900 hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
            <div className="bg-zinc-700 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Trophy size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white opacity-90 mb-2">Classement</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Performance ELO</p>
          </Link>

          <Link href="/stats" className="group relative bg-zinc-800/50 border border-white/10 p-8 rounded-3xl hover:bg-red-900 hover:border-red-600 transition-all duration-500 flex flex-col items-center text-center overflow-hidden">
            <div className="bg-zinc-700 p-4 rounded-2xl mb-6 group-hover:scale-[1.6] group-hover:bg-red-600 transition-all duration-500 shadow-xl">
              <Gauge size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-white opacity-90 mb-2">Statistiques</h3>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Les Tournois vue du coté des chiffres</p>
          </Link>          
            
        </div>
      </header>

      {/* SECTION MARKETING / INFO */}
      <section className="max-w-5xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/concept" className="group bg-zinc-800/40 border border-white/5 p-8 rounded-[2.5rem] hover:border-red-600 hover:bg-red-600/30 transition-all">
            <div className="bg-red-600/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-red-600 group-hover:scale-[1.6] group-hover:bg-red-500/30 transition-all duration-500 ">
              <Info size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white mb-2">Le Concept</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-4">L'organisation des poules et la route vers la grande finale.</p>
            <div className="flex items-center gap-2 text-red-600 font-black text-[10px] uppercase tracking-widest">
              Règlement <ChevronRight size={14} />
            </div>
          </Link>

          <Link href="/regles-elo" className="group bg-zinc-800/40 border border-white/5 p-8 rounded-[2.5rem] hover:border-purple-600/50 hover:bg-purple-600/30 transition-all">
            <div className="bg-purple-600/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-purple-600 group-hover:scale-[1.6] group-hover:bg-purple-600/30 transition-all duration-500 ">
              <BarChart3 size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic text-white mb-2">L'Algorithme</h3>
            <p className="text-zinc-500 text-sm leading-relaxed mb-4">Comprendre le calcul ELO Classic vs Modern.</p>
            <div className="flex items-center gap-2 text-purple-600 font-black text-[10px] uppercase tracking-widest">
              Détails techniques <ChevronRight size={14} />
            </div>
          </Link>

          <Link href="/about" className="group bg-zinc-800/40 border border-white/5 p-8 rounded-[2.5rem] hover:border-zinc-500 hover:bg-zinc-500/30 transition-all">
            <div className="bg-zinc-800 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-zinc-400 group-hover:scale-[1.6] group-hover:bg-zinc-600 transition-all duration-500 ">
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

    </div>
  );
}
