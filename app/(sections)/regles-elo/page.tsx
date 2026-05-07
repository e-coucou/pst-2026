import { Calculator, Zap, Info } from 'lucide-react';

export default function EloRulesPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-20 text-white min-h-screen">
      <div className="space-y-4 mb-12 group">
        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">
          <span className="text-white group-hover:text-red-600">L'Algorithme </span>
          <span className="text-red-600 group-hover:text-white">ELO</span>
        </h1>
        <p className="text-zinc-500 font-bold tracking-widest uppercase text-sm">Système de Rating International</p>
      </div>

      {/* INTRO */}
      <div className="prose prose-invert mb-16">
        <p className="text-lg text-zinc-400">
          Inspiré du système de la <span className="text-white font-bold">World Rugby (IRB)</span> utilisé depuis 2003, notre classement évalue le niveau relatif des joueurs avec une précision mathématique.
        </p>
      </div>

      {/* CLASSIC ELO */}
      <section className="mb-16 space-y-8">
        <div className="flex items-center gap-4 p-4 bg-red-600/10 rounded-2xl border border-red-600/20">
          <Calculator className="text-red-600" size={32} />
          <h2 className="text-3xl font-black uppercase italic">ELO Classic</h2>
        </div>

        <div className="space-y-6 text-zinc-400">
          <p>Chaque joueur débute avec un capital de <span className="text-white font-bold font-mono">100.0 pts</span>.</p>
          
		<div className="bg-zinc-900 p-8 rounded-3xl border border-white/5 space-y-4">
		  <h3 className="text-white font-black uppercase text-sm tracking-widest">La Formule de Base</h3>
		  <p className="text-sm italic mb-4 text-zinc-500">Soit <b>D</b> la différence de points ELO entre l'Équipe 1 (mieux classée) et l'Équipe 2 :</p>
		  
		  {/* FORMULE STYLE "CODE MATH" */}
		  <div className="bg-black/50 p-6 rounded-xl text-center font-mono text-red-500 border border-white/5">
		    <span className="text-2xl md:text-3xl font-bold">
		      D = min(ELO<sub>1</sub> - ELO<sub>2</sub>, 5)
		    </span>
		  </div>

		  <p className="text-sm italic mt-4 text-zinc-500">Points échangés lors de la rencontre :</p>
		  
		  <div className="space-y-3 pt-2">
		    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border-l-2 border-green-500">
		      <span className="text-[10px] font-black uppercase text-green-500 w-24">Victoire E1</span>
		      <code className="text-white font-bold text-lg">1 - (D/10)</code>
		    </div>
		    
		    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border-l-2 border-red-500">
		      <span className="text-[10px] font-black uppercase text-red-500 w-24">Défaite E1</span>
		      <code className="text-white font-bold text-lg">-(1 + (D/10))</code>
		    </div>
		    
		    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border-l-2 border-zinc-500">
		      <span className="text-[10px] font-black uppercase text-zinc-500 w-24">Match Nul</span>
		      <code className="text-white font-bold text-lg">-D / 10</code>
		    </div>
		  </div>
		</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
              <h4 className="text-red-600 font-black uppercase text-[10px] mb-2 tracking-widest text-center">Bonus Score</h4>
              <p className="text-sm">Cet échange de points peut être augmenté de 10% si l'écart du score est d'au moins 7 pts (ex: 13-6) : <span className="text-white font-bold"> dans ce cas l'écart est x 1.1</span></p>
            </div>
            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
              <h4 className="text-red-600 font-black uppercase text-[10px] mb-2 tracking-widest text-center">Bonus Prestige</h4>
              <p className="text-sm">Lors des phases Finales et aussi lors de la Finale des Bonus sont appliqués.</p>
              <p className="text-sm"> - Finalistes : <span className="text-white font-bold"> x 1.25</span></p>
              <p className="text-sm"> - Finales : <span className="text-white font-bold"> x 1.1</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* MODERN ELO */}
      <section className="mb-16 space-y-8">
        <div className="flex items-center gap-4 p-4 bg-purple-600/10 rounded-2xl border border-purple-600/20">
          <Zap className="text-purple-600" size={32} />
          <h2 className="text-3xl font-black uppercase italic">Modern ELO</h2>
        </div>
        <div className="bg-zinc-900 p-8 rounded-3xl border border-white/5">
          <p className="text-zinc-400 leading-relaxed mb-6">
            Contrairement au ELO Classic qui valorise la carrière entière, le <span className="text-white font-bold italic underline decoration-purple-500">Modern ELO</span> est un algorithme de "Forme" (Momentum Rating).
          </p>
          <ul className="space-y-4 text-sm text-zinc-300">
            <li className="flex gap-3 items-start">
              <span className="text-purple-500 font-black">01.</span>
              <span>Poids accru sur les 10 derniers matchs.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-purple-500 font-black">02.</span>
              <span>Sensibilité extrême aux "Clean Sheets" (13-0).</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-purple-500 font-black">03.</span>
              <span>Dévaluation automatique en cas d'inactivité prolongée.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* FOOTER WIKI */}
      <div className="mt-20 flex flex-col items-center gap-4 text-center">
        <Info className="text-zinc-700" />
        <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold">Pour les plus curieux</p>
        <a 
          href="https://fr.wikipedia.org/wiki/Classement_World_Rugby_des_%C3%A9quipes_nationales_de_rugby_%C3%A0_XV" 
          target="_blank" 
          className="text-red-600 hover:text-white transition-colors underline text-sm"
        >
          Consulter les bases mathématiques sur Wikipédia
        </a>
      </div>
    </div>
  );
}
