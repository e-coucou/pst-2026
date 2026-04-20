 import { createClient } from '@/utils/supabase/server'


interface SeasonStat {
  id: number;
  nom: string;
  annee: number;
  role: string;
  partenaire: string;
  pour: number;
  contre: number;
  goalavg: number;
  classement: number;
  victoires: number;
  defaites: number;
  nuls: number;
  palmares: string;
  finale_jouee: string;
  rang: number;
}

// Mise à jour de l'interface des Props
export default function SeasonHistory({ stats }: { stats: SeasonStat[] }) {

  console.log("Stats reçues par le composant :", stats);
  // Vérification de sécurité
  if (!stats || stats.length === 0) {
    return <div className="p-4 text-gray-500 italic">Aucune donnée historique trouvée.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-gray-300">
        <thead>
          <tr className="border-b border-gray-800 text-[10px] uppercase tracking-widest text-gray-500">
            <th className="p-4">Saison</th>
            <th className="p-4">Partenaire</th>
            <th className="p-4">Rôle</th>
            <th className="p-4 text-center">V/N/D</th>
            <th className="p-4 text-center">Place</th>
            <th className="p-4 text-right">ELO</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {stats.map((s, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              <td className="p-4 font-bold text-white">{s.annee}</td>
              <td className="p-4">{s.partenaire}</td>
              <td className="p-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  s.role_joueur === 'Tireur' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'
                }`}>
                  {s.role}
                </span>
              </td>
              <td className="p-4 text-center font-mono">
                {s.victoires}/{s.nuls}/{s.defaites}
              </td>
              <td className="p-4 text-center">
                <div className="flex flex-col">
                  <span className="text-xs font-bold">{s.finale_jouee}</span>
                  <span className="text-[10px] text-gray-500">Rang: {s.palmares}</span>
                </div>
              </td>
              <td className="p-4 text-right">
                <span className="bg-gray-800 px-2 py-1 rounded text-xs font-mono text-blue-400">
                  {s.rang}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
