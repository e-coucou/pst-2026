export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 md:p-20 text-white min-h-screen">
      <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-8">L'Esprit PST</h1>
      
      <div className="space-y-6 text-zinc-400 text-lg leading-relaxed">
        <p className="text-white font-bold">
          Ce site est une plateforme privée destinée exclusivement aux membres et amis de la Résidence Paris Saint-Tropez.
        </p>
        
        <p>
          Il a été conçu pour pimenter nos rencontres estivales en y ajoutant une pointe de compétition "professionnelle". Bien que les calculs ELO soient basés sur des algorithmes mathématiques réels, l'objectif principal reste le plaisir du jeu et la convivialité.
        </p>

        <div className="bg-red-600/10 border border-red-600/20 p-6 rounded-2xl">
          <h2 className="text-red-500 font-black uppercase text-sm mb-2">Disclaimer & Données</h2>
          <p className="text-sm">
            Les noms et statistiques affichés sont gérés par les organisateurs du tournoi. Ce site n'a aucune vocation commerciale et ne collecte aucune donnée à des fins publicitaires. C'est du "fait maison", avec passion.
          </p>
        </div>

        <p className="text-xs italic pt-10">
          Développé avec ❤️ pour la Saison 2026. Chrono officiel par Antoine.
        </p>
      </div>
    </div>
  );
}
