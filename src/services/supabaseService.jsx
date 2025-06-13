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
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async addPlayer(playerData) {
    const { data, error } = await supabase
      .from('players')
      .insert([{
        name: playerData.name,
        skill_level: playerData.skillLevel,
        email: playerData.email,
        phone: playerData.phone
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updatePlayer(id, playerData) {
    const { data, error } = await supabase
      .from('players')
      .update({
        name: playerData.name,
        skill_level: playerData.skillLevel,
        email: playerData.email,
        phone: playerData.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
      .order('created_at', { ascending: false });
    
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
        skill_combination: teamData.skillCombination
      }])
      .select()
      .single();
    
    if (teamError) {
      console.error('Team insert error:', teamError);
      throw teamError;
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
      .single();
    
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
      .single();
    
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
    
    // Determine winner if scores are provided
    if (matchData.team1Score !== undefined && matchData.team2Score !== undefined) {
      updateData.winner_team_id = matchData.team1Score > matchData.team2Score ? matchData.team1Id : matchData.team2Id;
      updateData.status = 'completed';
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
      .single();
    
    if (error) throw error;
    return data;
  }
}

export const supabaseService = new SupabaseService();

