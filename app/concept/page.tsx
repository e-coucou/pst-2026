import { Clock, Users, Swords, Trophy, MapPin, GitBranch, Heart, Star } from 'lucide-react';

export default function ConceptPage() {
  return (
  
	    <div className="max-w-4xl mx-auto p-6 md:p-20 text-white min-h-screen">
	      {/* HEADER */}
	      <div className="space-y-4 mb-12">
	        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
	          Le Règlement <span className="text-red-600">Officiel</span>
	        </h1>
	        <p className="text-zinc-500 font-bold tracking-widest uppercase text-sm">Édition Saison 2026</p>
	      </div>

	      {/* SECTION 1: LES CRÉATEURS (Richard & Christophe) */}
	      <section className="mb-16 relative">
	        <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 to-zinc-600/20 rounded-[2rem] blur opacity-75"></div>
	        <div className="relative bg-zinc-900/80 p-8 rounded-[2rem] border border-white/10 text-center">
	          <div className="flex justify-center gap-2 mb-4 text-red-600">
	            <Star size={20} fill="currentColor" />
	            <Star size={20} fill="currentColor" />
	          </div>
	          <h2 className="text-2xl font-black uppercase italic mb-4">Les Fondateurs</h2>
	          <p className="text-zinc-300 leading-relaxed italic">
	            "Nous tenons à remercier chaleureusement <span className="text-white font-bold">Richard et Christophe</span>, créateurs et concepteurs de ce tournoi. Grâce à leur vision et leur organisation, la Résidence Paris Saint-Tropez vibre chaque année lors de ces fins d'après-midis et soirées mémorables."
	          </p>
	          <div className="mt-4 flex items-center justify-center gap-2 text-red-500 font-black uppercase text-[10px] tracking-[0.3em]">
	            <Heart size={12} fill="currentColor" /> Merci à eux
	          </div>
	        </div>
	      </section>

		{/* SECTION 2: FORMAT ET DISCIPLINE */}
		<div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
		  
		  {/* BLOC JOUEURS */}
		  <div className="space-y-6 group">
		    <div className="flex items-center gap-4">
		      <div className="bg-red-600/10 p-3 rounded-2xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-500">
		        <Users size={28} />
		      </div>
		      <h2 className="text-2xl font-black uppercase italic tracking-tighter">Le Recrutement</h2>
		    </div>
		    <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
		      <p>
		        Le tournoi repose sur un équilibre fragile de <span className="text-white font-bold underline decoration-red-600">8 doublettes</span>. 
		        Chaque joueur doit prêter serment dans une catégorie unique : <span className="text-white font-bold uppercase">Tireur</span> ou <span className="text-white font-bold uppercase">Pointeur</span>.
		      </p>
		      <div className="bg-zinc-900/50 p-4 rounded-xl border-l-2 border-zinc-700 italic">
		        "Si le destin (ou l'arithmétique) fait défaut et que les quotas ne sont pas remplis, les <span className="text-red-500 font-bold uppercase">Organisateurs</span> tranchent souverainement sur les affectations."
		      </div>
		      <p>
		        Une fois les 16 athlètes répartis, les binômes sont constitués par un **tirage au sort** effectué par des mains innocentes, scellant ainsi les destins pour la journée.
		      </p>
		    </div>
		  </div>

		  {/* BLOC CHRONO (ANTOINE) */}
		  <div className="space-y-6 group">
		    <div className="flex items-center gap-4">
		      <div className="bg-red-600/10 p-3 rounded-2xl text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all duration-500">
		        <Clock size={28} />
		      </div>
		      <h2 className="text-2xl font-black uppercase italic tracking-tighter">La Dictature du Temps</h2>
		    </div>
		    <div className="space-y-4 text-zinc-400 text-sm leading-relaxed">
		      <p>
		        Pour la phase de poules, le temps est une ressource finie : <span className="text-white font-bold">20 minutes par match</span>, pas une seconde de plus.
		      </p>
		      <div className="bg-red-900/10 border border-red-600/20 p-4 rounded-xl relative overflow-hidden">
		        <div className="relative z-10">
		          <p className="text-red-500 font-black uppercase text-[10px] mb-2 tracking-widest flex items-center gap-2">
		             Attention : Chrono Officiel Antoine
		          </p>
		          <p className="italic">
		            "Redouté pour son autorité naturelle et sa pertinence chirurgicale, le <b>Chrono Officiel Antoine</b> est l'arbitre suprême. Au retentissement du sifflet, la mène en cours est instantanément annulée : seul le score acquis fait foi."
		          </p>
		        </div>
		      </div>
		      <p className="text-xs">
		        <span className="text-white font-bold uppercase">Note aux survivants :</span> Cette règle s'applique uniquement aux poules. En demis et finales, on retrouve le format "Marathon" : la première équipe à <span className="text-red-600 font-black italic text-lg">13 points</span> l'emporte.
		      </p>
		    </div>
		  </div>
		</div>


	      {/* SECTION 3: LES POULES */}
	      <div className="mb-16 space-y-8">
	        <h2 className="text-3xl font-black uppercase italic border-b border-zinc-800 pb-4 flex items-center gap-3">
	          <MapPin className="text-red-600" /> Phase de Poules
	        </h2>
	        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
	          <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600 shadow-xl">
	            <span className="font-black uppercase tracking-widest text-red-500 text-xs">Poule Gassin</span>
	            <p className="text-3xl font-black text-white italic mt-2 underline decoration-zinc-700">A, C, E, G</p>
	            <p className="text-xl font-black text-white italic mt-2 decoration-zinc-700">Organisée en 3 série de 2 matches</p>
	            <p className="text-sm font-black text-white italic mt-2 decoration-zinc-700">A-C & E-G</p>
	            <p className="text-sm font-black text-white italic mt-2 decoration-zinc-700">A-E & C-G</p>
	            <p className="text-sm font-black text-white italic mt-2 decoration-zinc-700">A-G & C-E</p>
	          </div>
	          <div className="bg-zinc-900 p-6 rounded-2xl border-l-4 border-red-600 shadow-xl">
	            <span className="font-black uppercase tracking-widest text-red-500 text-xs">Poule Ramatuelle</span>
	            <p className="text-3xl font-black text-white italic mt-2 underline decoration-zinc-700">B, D, F, H</p>
	            <p className="text-sm font-black text-white italic mt-2 decoration-zinc-700">B-D & F-H</p>
	            <p className="text-sm font-black text-white italic mt-2 decoration-zinc-700">B-F & D-H</p>
	            <p className="text-sm font-black text-white italic mt-2 decoration-zinc-700">B-H & D-F</p>
	          </div>
	        </div>
          <div className="space-y-4">
            <h3 className="text-zinc-500 font-black uppercase text-sm tracking-widest">Fonctionnement des Poules Gassin & Rammatuelle</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Dans chaque Poule toutes les équipes se rencontrent lors d'une manche de 20 minutes. Le score validé au moment du coup du sifflet : si la partie en cours n'est pas terminée elle est annulée.
              Chaque équipe joue donc 3 matches et les équipes sont classées suivant les points acquis lors des victoires (3 pts), les nuls (1 pts).</p>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Les équipes ayant les mêmes nombres de points sont alors départagées suivant le goal-average (la différence entre points marqués et points concédés). 
              Si les équipes ont alors le même goal-average c'est le vainqueur du match de poule qui les a opposés qui l'emporte.
            </p>
          </div>
 

	      </div>

      {/* SECTION 4: LE SYSTÈME DE DÉPARTAGE (NEW) */}
      <div className="mb-16 space-y-8">
        <h2 className="text-3xl font-black uppercase italic border-b border-zinc-800 pb-4 flex items-center gap-3">
          <GitBranch className="text-red-600" /> Les Demis-Finales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-red-600 font-black uppercase text-sm tracking-widest">Tableau Principal</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Les <span className="text-white font-bold underline">1ers et 2èmes</span> de chaque poule s'affrontent. 
              Les vainqueurs de ces demis accèdent à la <span className="text-white font-bold">Grande Finale (Places 1 & 2)</span>, 
              les perdants à la <span className="text-white font-bold">Petite Finale (Places 3 & 4)</span>.
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-zinc-500 font-black uppercase text-sm tracking-widest">Tableau de Repêchage</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Les <span className="text-white font-bold underline">3èmes et 4èmes</span> de chaque poule se rencontrent. 
              Les vainqueurs accèdent à la <span className="text-white font-bold">Toute Petite Finale (Places 5 & 6)</span>, 
              les perdants ferment la marche en <span className="text-white font-bold">Finale d'Honneur (Places 7 & 8)</span>.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 5: LES FINALES */}
      <div className="space-y-8 pb-20">
        <h2 className="text-3xl font-black uppercase italic border-b border-zinc-800 pb-4 flex items-center gap-3">
          <Trophy className="text-red-600" /> La Hiérarchie Finale
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {[
            { title: "Finale", desc: "Le titre suprême (Vainqueurs Principal)", ranking: "Places 1 & 2", color: "border-red-600 bg-red-600/10 text-red-500" },
            { title: "Petite Finale", desc: "Le podium (Perdants Principal)", ranking: "Places 3 & 4", color: "border-zinc-500 bg-zinc-900/50 text-zinc-300" },
            { title: "Toute Petite Finale", desc: "L'honneur du repêchage (Vainqueurs Repêchage)", ranking: "Places 5 & 6", color: "border-zinc-700 bg-zinc-900/30 text-zinc-500" },
            { title: "Finale d'Honneur", desc: "Le courage (Perdants Repêchage)", ranking: "Places 7 & 8", color: "border-zinc-800 bg-zinc-900/10 text-zinc-600" },
          ].map((f, i) => (
            <div key={i} className={`flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl border ${f.color} transition-transform hover:scale-[1.01]`}>
              <div className="flex flex-col">
                <span className="text-xl font-black uppercase italic">{f.title}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">{f.desc}</span>
              </div>
              <span className="mt-2 md:mt-0 font-mono font-bold uppercase text-xs px-3 py-1 bg-black/30 rounded-full w-fit">
                {f.ranking}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
