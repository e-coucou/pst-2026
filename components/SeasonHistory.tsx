import { createClient } from '@/utils/supabase/server'

export default async function SeasonHistory({ playerId }: { playerId: number }) {
  const supabase = await createClient()

  // Récupération des équipes du joueur et des matchs associés
  const { data: teams } = await supabase
    .from('teams')
    .select(`
      id,
      nom,
      tireur_id,
      pointeur_id,
      annee,
      games_as_team1:games!team_1_id (id, score_1, score_2, type, year, team_2_id),
      games_as_team2:games!team_2_id (id, score_1, score_2, type, year, team_1_id)
    `)
    .or(`tireur_id.eq.${playerId},pointeur_id.eq.${playerId}`)
    .order('annee', { ascending: false })

  if (!teams) return null

  return (
    <div className="grid gap-6">
      {teams.map((team) => {
        const allGames = [...(team.games_as_team1 || []), ...(team.games_as_team2 || [])]
          .sort((a, b) => b.id - a.id)

        const role = team.tireur_id === playerId ? 'Tireur 🔫' : 'Pointeur 🪩'

        return (
          <div key={team.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="bg-gray-800/50 px-4 py-2 flex justify-between items-center border-b border-gray-800">
              <span className="font-bold text-white">{team.annee} — {team.nom}</span>
              <span className="text-xs text-blue-400 font-medium px-2 py-1 bg-blue-400/10 rounded">{role}</span>
            </div>
            
            <div className="p-4 space-y-3">
              {allGames.map((game: any) => {
                const isTeam1 = team.id === game.team_2_id ? false : true // Logique simplifiée
                const myScore = isTeam1 ? game.score_1 : game.score_2
                const opScore = isTeam1 ? game.score_2 : game.score_1
                const isWin = myScore > opScore

                return (
                  <div key={game.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 w-24">{game.type}</span>
                    <div className={`font-mono font-bold px-3 py-1 rounded ${isWin ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {myScore} - {opScore}
                    </div>
                    <span className="text-gray-500 text-xs italic">vs id_oppo</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
