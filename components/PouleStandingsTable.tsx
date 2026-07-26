'use client';

import { Target } from 'lucide-react';
import { PouleStanding } from '@/utils/live-stats';

// Tableau de classement de poule unique, réutilisé par poules/finale/podium/live pour que le
// palmarès soit identique partout (référence : la version complète affichée en direct pendant
// la saisie des scores). V/D/N/Pour/Contre masqués sur mobile pour ne pas surcharger, Pts/Diff
// toujours visibles.
export default function PouleStandingsTable({
  pouleName,
  standings,
  accentColor,
  showHeader = true,
}: {
  pouleName: string;
  standings: PouleStanding[];
  accentColor: 'orange' | 'purple';
  // À mettre à false quand la page affiche déjà un titre "Poule X" englobant (ex: poules/page.tsx,
  // qui montre matchs + classement côte à côte sous un même en-tête) — évite la répétition.
  showHeader?: boolean;
}) {
  const isOrange = accentColor === 'orange';
  const textColor = isOrange ? 'text-orange-500' : 'text-purple-500';
  const rowHighlight = isOrange ? 'bg-orange-500/10' : 'bg-purple-500/10';
  // Le code équipe (ex: "A") n'existe que côté live (live_teams.id est une lettre A-J) — les
  // saisons archivées (table `teams`) n'ont qu'un id numérique auto-incrémenté, pas de lettre.
  const isTeamLetter = (id: string) => /^[A-Z]$/.test(id);

  return (
    <div className="bg-black border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden">
      {showHeader && (
        <div className={`px-4 py-2 text-sm md:text-base font-black uppercase italic ${textColor} bg-white/5 border-b border-white/10 flex items-center gap-2`}>
          <Target size={16} />
          Poule {pouleName}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[300px]">
          <thead>
            <tr className="text-[10px] md:text-[12px] uppercase text-zinc-300 border-b border-white/10">
              <th className="p-3 md:p-4 hidden md:table-cell">Rk</th>
              <th className="p-3 md:p-4">Équipe</th>
              <th className="p-3 md:p-4 text-center hidden md:table-cell">J</th>
              <th className="p-3 md:p-4 text-center hidden md:table-cell">V/D/N</th>
              <th className="p-3 md:p-4 text-center hidden md:table-cell">P/C</th>
              <th className="p-3 md:p-4 text-center">Diff</th>
              <th className="p-3 md:p-4 text-center text-red-500">PTS</th>
            </tr>
          </thead>
          <tbody className="text-[12px] md:text-[14px] text-white font-bold">
            {standings.map((s, idx) => (
              <tr key={s.id} className={`border-b border-white/5 last:border-0 ${idx < 2 ? rowHighlight : ''}`}>
                <td className="p-3 md:p-4 text-zinc-300 hidden md:table-cell">
                  {idx + 1}.{isTeamLetter(s.id) && <span className="text-white"> {s.id}</span>}
                </td>
                <td className="p-3 md:p-4 uppercase truncate max-w-[100px] md:max-w-none">
                  <span className="text-zinc-300 md:hidden mr-1 normal-case font-normal">
                    {idx + 1}.{isTeamLetter(s.id) && <span className="text-white"> {s.id}</span>}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-purple-500 truncate">{s.pName.split(' ')[0]}</span>
                    <span className="text-orange-500 truncate">{s.tName.split(' ')[0]}</span>
                  </div>
                </td>
                <td className="p-3 md:p-4 text-center text-zinc-300 hidden md:table-cell">{s.j}</td>
                <td className="p-3 md:p-4 text-center hidden md:table-cell">
                  <span className="text-green-500">{s.v}</span>
                  <span className="text-zinc-500">/</span>
                  <span className="text-red-500">{s.d}</span>
                  <span className="text-zinc-500">/</span>
                  <span className="text-zinc-300">{s.n}</span>
                </td>
                <td className="p-3 md:p-4 text-center hidden md:table-cell">
                  <span className="text-green-500">+{s.pour}</span>
                  <span className="text-zinc-500"> / </span>
                  <span className="text-red-500">-{s.contre}</span>
                </td>
                <td className={`p-3 md:p-4 text-center ${s.diff > 0 ? 'text-green-500' : s.diff < 0 ? 'text-red-500' : ''}`}>
                  {s.diff > 0 ? `+${s.diff}` : s.diff}
                </td>
                <td className="p-3 md:p-4 text-center text-white bg-white/5">{s.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
