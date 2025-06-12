import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase service object with all database operations
export const supabaseService = {
  // Players operations
  async getPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addPlayer(playerData) {
    const { data, error } = await supabase
      .from('players')
      .insert([{
        name: playerData.name,
        skill_level: playerData.skillLevel,
        email: playerData.email,
        phone: playerData.phone,
        points: 0,
        matches_played: 0,
        matches_won: 0
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePlayer(id, playerData) {
    const { data, error } = await supabase
      .from('players')
      .update({
        name: playerData.name,
        skill_level: playerData.skillLevel,
        email: playerData.email,
        phone: playerData.phone,
        ...(playerData.points !== undefined && { points: playerData.points }),
        ...(playerData.matchesPlayed !== undefined && { matches_played: playerData.matchesPlayed }),
        ...(playerData.matchesWon !== undefined && { matches_won: playerData.matchesWon })
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deletePlayer(id) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Teams operations
  async getTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select(\`
        *,
        team_players(
          player_id,
          players(*)
        )
      \`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addTeam(teamData) {
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert([{
        name: teamData.name,
        skill_combination: teamData.skillCombination,
        points: 0,
        matches_played: 0,
        matches_won: 0
      }])
      .select()
      .single();

    if (teamError) throw teamError;

    // Add team players
    if (teamData.playerIds && teamData.playerIds.length > 0) {
      const teamPlayers = teamData.playerIds.map(playerId => ({
        team_id: team.id,
        player_id: playerId
      }));

      const { error: playersError } = await supabase
        .from('team_players')
        .insert(teamPlayers);

      if (playersError) throw playersError;
    }

    return team;
  },

  async updateTeam(id, teamData) {
    const { data, error } = await supabase
      .from('teams')
      .update({
        name: teamData.name,
        skill_combination: teamData.skillCombination,
        ...(teamData.points !== undefined && { points: teamData.points }),
        ...(teamData.matchesPlayed !== undefined && { matches_played: teamData.matchesPlayed }),
        ...(teamData.matchesWon !== undefined && { matches_won: teamData.matchesWon })
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTeam(id) {
    // First delete team players
    await supabase
      .from('team_players')
      .delete()
      .eq('team_id', id);

    // Then delete the team
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Matches operations
  async getMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select(\`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        match_players(
          player_id,
          players(*)
        )
      \`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addMatch(matchData) {
    const { data, error } = await supabase
      .from('matches')
      .insert([{
        team1_id: matchData.team1Id,
        team2_id: matchData.team2Id,
        scheduled_date: matchData.scheduledDate,
        status: matchData.status || 'scheduled',
        team1_score: matchData.team1Score || 0,
        team2_score: matchData.team2Score || 0,
        winner_team_id: matchData.winnerTeamId || null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMatch(id, matchData) {
    const { data, error } = await supabase
      .from('matches')
      .update({
        scheduled_date: matchData.scheduledDate,
        status: matchData.status,
        team1_score: matchData.team1Score,
        team2_score: matchData.team2Score,
        winner_team_id: matchData.winnerTeamId,
        match_date: matchData.matchDate
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Match players operations
  async addMatchPlayers(matchId, playerIds) {
    const matchPlayers = playerIds.map(playerId => ({
      match_id: matchId,
      player_id: playerId
    }));

    const { error } = await supabase
      .from('match_players')
      .insert(matchPlayers);

    if (error) throw error;
  },

  async updateMatchPlayers(matchId, playerIds) {
    // First remove existing players
    await supabase
      .from('match_players')
      .delete()
      .eq('match_id', matchId);

    // Then add new players
    if (playerIds.length > 0) {
      await this.addMatchPlayers(matchId, playerIds);
    }
  }
};
