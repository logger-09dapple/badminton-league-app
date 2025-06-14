import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

class SupabaseService {
  // Player operations
  async getPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('points', { ascending: false }); // Order by points for ranking
    
    if (error) throw error;
    return data || [];
  }

  async addPlayer(playerData) {
    const { data, error } = await supabase
      .from('players')
      .insert([{
        name: playerData.name,
        skill_level: playerData.skillLevel,
	gender: playerData.gender,
        email: playerData.email,
        phone: playerData.phone
      }])
      .select()
      .maybeSingle(); // FIXED: Use maybeSingle() instead of single()
    
    if (error) throw error;
    return data;
  }

  async updatePlayer(id, playerData) {
    const { data, error } = await supabase
      .from('players')
      .update({
        name: playerData.name,
        skill_level: playerData.skillLevel,
	gender: playerData.gender,
        email: playerData.email,
        phone: playerData.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  // NEW: Update player statistics when match is completed
  async updatePlayerStats(playerId, won) {
    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();
    
    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('players')
      .update({
        matches_played: (player.matches_played || 0) + 1,
        matches_won: (player.matches_won || 0) + (won ? 1 : 0),
        points: (player.points || 0) + (won ? 1 : 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deletePlayer(id) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Team operations
  async getTeams() {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_players (
          player_id,
          players (*)
        )
      `)
      .order('points', { ascending: false }); // Order by points for ranking
    
    if (error) throw error;
    return data || [];
  }

  async addTeam(teamData) {
    console.log('Adding team with data:', teamData);
    
    // Insert team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert([{
        name: teamData.name,
        skill_combination: teamData.skillCombination,
        team_type: teamData.teamType || 'same-gender' // NEW: Track team type
      }])
      .select()
      .maybeSingle();
    
    if (teamError) {
      console.error('Team insert error:', teamError);
      throw teamError;
    }

    if (!team) {
      throw new Error('Failed to create team - no data returned');
    }

    // Insert team players if provided
    if (teamData.playerIds && teamData.playerIds.length > 0) {
      const teamPlayerData = teamData.playerIds.map(playerId => ({
        team_id: team.id,
        player_id: playerId
      }));

      console.log('Inserting team players:', teamPlayerData);

      const { error: playersError } = await supabase
        .from('team_players')
        .insert(teamPlayerData);
      
      if (playersError) {
        console.error('Team players insert error:', playersError);
        throw playersError;
      }
    }

    // Return team with players
    return this.getTeamById(team.id);
  }

  async getTeamById(id) {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_players (
          player_id,
          players (*)
        )
      `)
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  async updateTeam(id, teamData) {
    // Update team
    const { error: teamError } = await supabase
      .from('teams')
      .update({
        name: teamData.name,
        skill_combination: teamData.skillCombination,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (teamError) throw teamError;

    // Update team players if provided
    if (teamData.playerIds) {
      // Remove existing players
      await supabase
        .from('team_players')
        .delete()
        .eq('team_id', id);

      // Add new players
      if (teamData.playerIds.length > 0) {
        const teamPlayerData = teamData.playerIds.map(playerId => ({
          team_id: id,
          player_id: playerId
        }));

        const { error: playersError } = await supabase
          .from('team_players')
          .insert(teamPlayerData);
        
        if (playersError) throw playersError;
      }
    }

    return this.getTeamById(id);
  }

  // NEW: Update team statistics when match is completed
  async updateTeamStats(teamId, won) {
    const { data: team, error: fetchError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('teams')
      .update({
        matches_played: (team.matches_played || 0) + 1,
        matches_won: (team.matches_won || 0) + (won ? 1 : 0),
        points: (team.points || 0) + (won ? 1 : 0),
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTeam(id) {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // NEW: Delete all teams function
  async deleteAllTeams() {
    const { error } = await supabase
      .from('teams')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all teams
    
    if (error) throw error;
  }

  // FIXED: Match operations with correct column names (snake_case)
  async getMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        winner_team:teams!matches_winner_team_id_fkey(*),
        match_players (
          player_id,
          players (*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  // NEW: Get matches with team players included
  async getMatchesWithPlayers() {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(
          *,
          team_players (
            player_id,
            players (*)
          )
        ),
        team2:teams!matches_team2_id_fkey(
          *,
          team_players (
            player_id,
            players (*)
          )
        ),
        winner_team:teams!matches_winner_team_id_fkey(*),
        match_players (
          player_id,
          team_id,
          players (*)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async addMatch(matchData) {
    const { data, error } = await supabase
      .from('matches')
      .insert([{
        team1_id: matchData.team1Id,
        team2_id: matchData.team2Id,
        scheduled_date: matchData.scheduledDate || null, // FIXED: Use snake_case
        status: matchData.status || 'scheduled'
      }])
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*)
      `)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  // NEW: Bulk add matches for schedule generation
  async addMatches(matchesData) {
    console.log('Adding matches in bulk:', matchesData);
    
    const { data, error } = await supabase
      .from('matches')
      .insert(matchesData.map(match => ({
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        scheduled_date: match.scheduled_date || null, // FIXED: Use snake_case
        status: match.status || 'scheduled'
      })))
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*)
      `);
    
    if (error) {
      console.error('Bulk insert error:', error);
      throw error;
    }
    
    console.log('Successfully added matches:', data);
    return data || [];
  }

  // ENHANCED: Update match with automatic completion and statistics update
  async updateMatch(id, matchData) {
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (matchData.team1Id) updateData.team1_id = matchData.team1Id;
    if (matchData.team2Id) updateData.team2_id = matchData.team2Id;
    if (matchData.scheduledDate !== undefined) updateData.scheduled_date = matchData.scheduledDate; // FIXED: Use snake_case
    if (matchData.status) updateData.status = matchData.status;
    if (matchData.team1Score !== undefined) updateData.team1_score = matchData.team1Score;
    if (matchData.team2Score !== undefined) updateData.team2_score = matchData.team2Score;
    
    // Auto-determine winner and complete match when scores are provided
    if (matchData.team1Score !== undefined && matchData.team2Score !== undefined) {
      const winnerId = matchData.team1Score > matchData.team2Score ? matchData.team1Id : matchData.team2Id;
      updateData.winner_team_id = winnerId;
      updateData.status = 'completed';

      // Update team statistics
      await this.updateTeamStats(matchData.team1Id, matchData.team1Score > matchData.team2Score);
      await this.updateTeamStats(matchData.team2Id, matchData.team2Score > matchData.team1Score);

      // Update player statistics for team players
      const team1Players = await this.getTeamPlayerIds(matchData.team1Id);
      const team2Players = await this.getTeamPlayerIds(matchData.team2Id);

      for (const playerId of team1Players) {
        await this.updatePlayerStats(playerId, matchData.team1Score > matchData.team2Score);
      }

      for (const playerId of team2Players) {
        await this.updatePlayerStats(playerId, matchData.team2Score > matchData.team1Score);
      }
    }

    const { data, error } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        winner_team:teams!matches_winner_team_id_fkey(*)
      `)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  }

  // Helper function to get team player IDs
  async getTeamPlayerIds(teamId) {
    const { data, error } = await supabase
      .from('team_players')
      .select('player_id')
      .eq('team_id', teamId);
    
    if (error) throw error;
    return data.map(tp => tp.player_id);
  }

  // NEW: Delete all matches function
  async deleteAllMatches() {
    const { error } = await supabase
      .from('matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (error) throw error;
  }
}

export const supabaseService = new SupabaseService();

