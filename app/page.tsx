'use client'; // On ajoute ça tout en haut pour autoriser le code interactif

import React, { useEffect, useState } from 'react';
import { Trophy, Users, Video } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Import de ton client
import Link from 'next/link';

export default function Home() {
	const [count, setCount] = useState<number | null>(null);

	  useEffect(() => {
	    // Petite fonction pour compter les joueurs
	    const fetchJoueurs = async () => {
	      const { count, error } = await supabase
	        .from('joueurs')
	        .select('*', { count: 'exact', head: true });
	      
	      if (!error) setCount(count);
	    };

	    fetchJoueurs();
	  }, []);
  return (
	<div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* HEADER / NAVIGATION */}
      <nav className="flex items-center justify-between p-6 bg-white shadow-sm sticky top-0 z-50">
        <h1 className="text-xl font-bold tracking-tight text-blue-700">Pétanque PST <span className="text-orange-500">2.0</span></h1>
        <div className="flex items-center gap-4">
          {/* On affiche le compteur ici pour le test ! */}
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
            {count !== null ? `${count} joueurs inscrits` : 'Connexion...'}
          </span>
          <button className="px-4 py-2 text-sm font-bold bg-blue-700 text-white rounded-full">Connexion</button>
        </div>
      </nav>
      {/* HERO SECTION */}
      <header className="px-6 py-12 md:py-24 max-w-5xl mx-auto text-center">
        <span className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">Saison 2026</span>
        <h2 className="mt-6 text-4xl md:text-6xl font-extrabold leading-tight">
          Le classement officiel de la <span className="text-blue-700">Pétanque Saint-Tropez</span>
        </h2>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Suivez les scores en direct, consultez votre classement ELO et accédez aux contenus exclusifs du club.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/classement" className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:scale-105 transition-transform">Voir le Classement <Trophy size={20} />
          </Link>
          <button className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:scale-105 transition-transform">
            Voir le Classement <Trophy size={20} />
          </button>
          <button className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-colors text-slate-700">
            Dernières Vidéos <Video size={20} />
          </button>
        </div>
      </header>

      {/* GRILLE DE FONCTIONNALITÉS (Adaptative iPhone/Desktop) */}
      <section className="px-6 py-12 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mb-4">
              <Users size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Accès Joueurs</h3>
            <p className="text-slate-600">Connectez-vous pour voir vos statistiques détaillées et votre historique.</p>
          </div>
          
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center mb-4">
              <Trophy size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Système ELO</h3>
            <p className="text-slate-600">Un calcul précis inspiré de l'IRB pour classer équitablement chaque talent.</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mb-4">
              <Video size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">Contenu Protégé</h3>
            <p className="text-slate-600">Vidéos et photos des tournois accessibles uniquement aux membres.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
