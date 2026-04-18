// Exemple de ce qu'on va récupérer pour un joueur
const { data: profile } = await supabase
  .from('profiles')
  .select(`
    *,
    elo_history (*), 
    teams (
      *,
      games_as_team1:games!team_1_id (*),
      games_as_team2:games!team_2_id (*)
    )
  `)
  .eq('id', playerId);
