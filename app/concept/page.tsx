import { Clock, Users, Swords, Trophy, MapPin } from 'lucide-react';

export default function ConceptPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-20 text-white min-h-screen">
      <div className="space-y-4 mb-12">
        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
          Le Règlement <span className="text-red-600">Officiel</span>
        </h1>
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-sm">Édition Saison 2026</p>
      </div>

      {/* SECTION 1: HISTOIRE */}
      <section className="mb-16 bg-zinc-900/30 p-8 rounded-[2rem] border border-white/5">
        <p className="text-xl text-zinc-300 leading-relaxed italic">
          "Le tournoi de la Résidence Paris Saint-Tropez a vu le jour en 2020. Ce qui n'était qu'un défi entre amis est devenu le rendez-vous incontournable de l'été, régi par des règles strictes et un chronométrage implacable."
        </p>
      </section>

      {/* SECTION 2: FORMAT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Users className="text-red-600" />
            <h2 className="text-2xl font-black uppercase italic">Les Athlètes</h2>
          </div>
          <p className="text-zinc-400">
            Le concours réunit <span className="text-white font-bold">8 doublettes</span> (équipes de A à H). 
            Chaque équipe est obligatoirement composée d'un <span className="text-red-500 font-bold uppercase">Tireur</span> et d'un <span className="text-white font-bold uppercase">Pointeur</span>.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Clock className="text-red-600" />
            <h2 className="text-2xl font-black uppercase italic">Le Temps</h2>
          </div>
          <p className="text-zinc-400">
            Toutes les rencontres durent exactement <span className="text-white font-bold">20 minutes</span>. 
            Le chronométrage est assuré par le <span className="text-red-500 font-bold">Chrono Officiel ANTOINE</span>. Aucune seconde supplémentaire n'est accordée.
          </p>
        </div>
      </div>

      {/* SECTION 3: LES POULES */}
      <div className="mb-16 space-y-8">
        <h2 className="text-3xl font-black uppercase italic border-b border-zinc-800 pb-4">La Phase de Poules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600">
            <div className="flex items-center justify-between mb-4">
              <span className="font-black uppercase tracking-widest text-red-500">Poule Gassin</span>
              <MapPin size={16} />
            </div>
            <p className="text-3xl font-black text-white italic">A, C, E, G</p>
          </div>
          <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600">
            <div className="flex items-center justify-between mb-4">
              <span className="font-black uppercase tracking-widest text-red-500">Poule Ramatuelle</span>
              <MapPin size={16} />
            </div>
            <p className="text-3xl font-black text-white italic">B, D, F, H</p>
          </div>
        </div>
        <p className="text-zinc-500 text-sm italic">Système de points : Victoire = 3 pts | Nul = 1 pt | Défaite = 0 pt.</p>
      </div>

      {/* SECTION 4: PHASES FINALES */}
      <div className="space-y-8">
        <h2 className="text-3xl font-black uppercase italic border-b border-zinc-800 pb-4">La Hiérarchie des Finales</h2>
        <div className="space-y-4">
          {[
            { title: "La Finale", desc: "Vainqueurs des 2 demis du tableau Principal", color: "text-red-600" },
            { title: "Petite Finale", desc: "Perdants du tableau Principal", color: "text-zinc-300" },
            { title: "Toute Petite Finale", desc: "Vainqueurs des demis du tableau Repêchage", color: "text-zinc-500" },
            { title: "Finale d'Honneur", desc: "Perdants du Repêchage", color: "text-zinc-600" },
          ].map((f, i) => (
            <div key={i} className="flex flex-col md:flex-row md:items-center justify-between bg-zinc-900/50 p-6 rounded-xl border border-white/5">
              <span className={`text-xl font-black uppercase italic ${f.color}`}>{f.title}</span>
              <span className="text-zinc-400 text-sm uppercase font-bold">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
