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

// Enhanced Teams Query with Explicit Relationship Disambiguation
async getTeams() {
  try {
    console.log('🔍 Fetching teams with players using explicit joins...');
    
    // Use explicit relationship disambiguation to avoid ambiguity
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_players!team_players_team_id_fkey (
          player_id,
          players!team_players_player_id_fkey (
            id,
            name,
            skill_level,
            gender,
            email,
            phone,
            matches_played,
            matches_won,
            points
          )
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase teams query error:', error);
      throw error;
    }

    console.log('📄 Raw teams data from Supabase:', data);

    // Enhanced data transformation with comprehensive validation
    const transformedTeams = (data || []).map(team => {
      console.log(`🔍 Processing team: ${team.name}`);
      console.log('Raw team_players data:', team.team_players);
      
      // Extract players from the junction table structure
      const players = [];
      
      if (team.team_players && Array.isArray(team.team_players)) {
        team.team_players.forEach(tp => {
          if (tp.players && tp.players.id) {
            players.push(tp.players);
            console.log(`✅ Added player: ${tp.players.name} (${tp.players.id})`);
          } else {
            console.warn(`⚠️ Missing player data for team ${team.name}, team_player entry:`, tp);
          }
        });
      } else {
        console.warn(`⚠️ Team ${team.name} has no team_players array:`, team.team_players);
      }
      
      const transformedTeam = {
        ...team,
        players: players,
        playerCount: players.length,
        isValid: players.length === 2 && players.every(p => p.id && p.name && p.skill_level)
      };

      console.log(`📊 Team ${team.name} transformation result:`, {
        playerCount: transformedTeam.playerCount,
        isValid: transformedTeam.isValid,
        playerNames: transformedTeam.players.map(p => p.name)
      });

      return transformedTeam;
    });

    const validTeams = transformedTeams.filter(team => team.isValid);
    const invalidTeams = transformedTeams.filter(team => !team.isValid);

    if (invalidTeams.length > 0) {
      console.error(`❌ Found ${invalidTeams.length} invalid teams:`, 
        invalidTeams.map(t => ({
          name: t.name,
          playerCount: t.playerCount,
          players: t.players?.map(p => p.name) || []
        }))
      );
    }

    console.log(`✅ Team loading summary: ${validTeams.length} valid, ${invalidTeams.length} invalid`);
    
    return transformedTeams;
    
  } catch (error) {
    console.error('💥 Error in getTeams:', error);
    throw new Error(`Failed to load teams with players: ${error.message}`);
  }
}
	

  // Team operations

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

// Enhanced match insertion with cross-skill metadata
async addMatches(matchesData) {
  console.log('💾 Adding matches with cross-skill support:', matchesData.length);
  
  const { data, error } = await supabase
    .from('matches')
    .insert(matchesData.map(match => ({
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      scheduled_date: match.scheduled_date || null,
      status: match.status || 'scheduled',
      match_type: match.match_type || 'same-skill', // NEW: Track match type
      gender_category: match.gender_category || 'male' ,
      pairing_description: match.pairing_description || null, // NEW: Description
      skill_combination_1: match.skill_combination_1 || null, // NEW: Team 1 skill
      skill_combination_2: match.skill_combination_2 || null  // NEW: Team 2 skill
    })))
    .select(`
      *,
      team1:teams!matches_team1_id_fkey(*),
      team2:teams!matches_team2_id_fkey(*)
    `);
  
  if (error) {
    console.error('❌ Bulk insert error:', error);
    throw error;
  }
  
  console.log('✅ Successfully added matches:', data?.length || 0);
  return data || [];
}

// FIXED: Regular match update with proper winner calculation
async updateMatch(id, matchData) {
  const updateData = {
    updated_at: new Date().toISOString()
  };

  if (matchData.team1Id) updateData.team1_id = matchData.team1Id;
  if (matchData.team2Id) updateData.team2_id = matchData.team2Id;
  if (matchData.scheduledDate !== undefined) updateData.scheduled_date = matchData.scheduledDate;
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

//  // ENHANCED: Update match with automatic completion and statistics update
//  async updateMatch(id, matchData) {
//    const updateData = {
//      updated_at: new Date().toISOString()
//    };
//
//    if (matchData.team1Id) updateData.team1_id = matchData.team1Id;
//    if (matchData.team2Id) updateData.team2_id = matchData.team2Id;
//    if (matchData.scheduledDate !== undefined) updateData.scheduled_date = matchData.scheduledDate; // FIXED: Use snake_case
//    if (matchData.status) updateData.status = matchData.status;
//    if (matchData.team1Score !== undefined) updateData.team1_score = matchData.team1Score;
//    if (matchData.team2Score !== undefined) updateData.team2_score = matchData.team2Score;
//    
//    // Auto-determine winner and complete match when scores are provided
//    if (matchData.team1Score !== undefined && matchData.team2Score !== undefined) {
//      const winnerId = matchData.team1Score > matchData.team2Score ? matchData.team1Id : matchData.team2Id;
//      updateData.winner_team_id = winnerId;
//      updateData.status = 'completed';
//
//      // Update team statistics
//      await this.updateTeamStats(matchData.team1Id, matchData.team1Score > matchData.team2Score);
//      await this.updateTeamStats(matchData.team2Id, matchData.team2Score > matchData.team1Score);
//
//      // Update player statistics for team players
//      const team1Players = await this.getTeamPlayerIds(matchData.team1Id);
//      const team2Players = await this.getTeamPlayerIds(matchData.team2Id);
//
//      for (const playerId of team1Players) {
//        await this.updatePlayerStats(playerId, matchData.team1Score > matchData.team2Score);
//      }
//
//      for (const playerId of team2Players) {
//        await this.updatePlayerStats(playerId, matchData.team2Score > matchData.team1Score);
//      }
//    }
//
//    const { data, error } = await supabase
//      .from('matches')
//      .update(updateData)
//      .eq('id', id)
//      .select(`
//        *,
//        team1:teams!matches_team1_id_fkey(*),
//        team2:teams!matches_team2_id_fkey(*),
//        winner_team:teams!matches_winner_team_id_fkey(*)
//      `)
//      .maybeSingle();
//    
//    if (error) throw error;
//    return data;
//  }

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

// Add this method to your SupabaseService class
async validateTeamPlayerIntegrity() {
  console.log('🔍 Checking team-player relationship integrity...');
  
  try {
    // Check for teams without players
    const { data: teamsWithoutPlayers, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id, name,
        team_players(count)
      `);
    
    if (teamsError) throw teamsError;

    const emptyTeams = teamsWithoutPlayers.filter(team => 
      !team.team_players || team.team_players.length === 0 || team.team_players[0].count === 0
    );

    if (emptyTeams.length > 0) {
      console.warn('⚠️ Teams without players:', emptyTeams.map(t => t.name));
    }

    // Check for orphaned team_players entries
    const { data: orphanedEntries, error: orphanError } = await supabase
      .from('team_players')
      .select(`
        id, team_id, player_id,
        teams(name),
        players(name)
      `);
    
    if (orphanError) throw orphanError;

    const orphaned = orphanedEntries.filter(entry => 
      !entry.teams || !entry.players
    );

    if (orphaned.length > 0) {
      console.warn('⚠️ Orphaned team-player relationships:', orphaned);
    }

    console.log(`✅ Integrity check complete: ${emptyTeams.length} empty teams, ${orphaned.length} orphaned entries`);
    
    return {
      emptyTeams,
      orphanedEntries: orphaned,
      isHealthy: emptyTeams.length === 0 && orphaned.length === 0
    };
    
  } catch (error) {
    console.error('💥 Integrity check failed:', error);
    throw error;
  }
}

// Add these methods to your existing SupabaseService class

// Update player with ELO rating
async updatePlayerEloRating(playerId, eloData) {
  try {
    const { data, error } = await supabase
      .from('players')
      .update({
        elo_rating: eloData.newRating,
        peak_elo_rating: Math.max(eloData.newRating, eloData.oldPeakRating || 0),
        skill_level: eloData.newSkillLevel,
        elo_games_played: (eloData.oldGamesPlayed || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', playerId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating player ELO:', error);
    throw error;
  }
}

// Record rating history
async recordRatingHistory(historyData) {
  try {
    const { data, error } = await supabase
      .from('player_rating_history')
      .insert(historyData)
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording rating history:', error);
    throw error;
  }
}

// Record skill level changes
async recordSkillLevelChange(changeData) {
  try {
    const { data, error } = await supabase
      .from('skill_level_changes')
      .insert({
        player_id: changeData.playerId,
        old_skill_level: changeData.oldSkillLevel,
        new_skill_level: changeData.newSkillLevel,
        elo_rating: changeData.eloRating,
        reason: changeData.reason || 'ELO threshold crossed',
        auto_applied: changeData.autoApplied !== false
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error recording skill level change:', error);
    throw error;
  }
}

// Get player rankings by ELO
async getPlayerRankingsByElo() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('elo_rating', { ascending: false });
    
    if (error) throw error;
    
    // Add ranking positions
    return data.map((player, index) => ({
      ...player,
      rank: index + 1,
      win_percentage: player.matches_played > 0 
        ? Math.round((player.matches_won / player.matches_played) * 100) 
        : 0
    }));
  } catch (error) {
    console.error('Error getting player rankings:', error);
    throw error;
  }
}

// Get team rankings by ELO
async getTeamRankingsByElo() {
  try {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        *,
        team_players (
          player_id,
          players (
            id,
            name,
            elo_rating
          )
        )
      `)
      .order('elo_rating', { ascending: false });
    
    if (error) throw error;
    
    // Calculate team average ELO and add rankings
    return data.map((team, index) => {
      const players = team.team_players?.map(tp => tp.players).filter(Boolean) || [];
      const avgElo = players.length > 0 
        ? Math.round(players.reduce((sum, p) => sum + (p.elo_rating || 1500), 0) / players.length)
        : team.elo_rating || 1500;
      
      return {
        ...team,
        rank: index + 1,
        avg_player_elo: avgElo,
        win_percentage: team.matches_played > 0 
          ? Math.round((team.matches_won / team.matches_played) * 100) 
          : 0
      };
    });
  } catch (error) {
    console.error('Error getting team rankings:', error);
    throw error;
  }
}

// FIXED: Enhanced player data fetching with proper error handling
async updateMatchWithElo(matchId, matchData, eloUpdates, wasAlreadyCompleted = false) {
  try {
    console.log('Processing match update with ELO:', {
      matchId,
      wasAlreadyCompleted,
      eloUpdatesCount: eloUpdates?.length || 0
    });

    // Validate ELO updates array
    if (!Array.isArray(eloUpdates) || eloUpdates.length === 0) {
      console.warn('No ELO updates provided, performing regular match update');
      return await this.updateMatch(matchId, matchData);
    }

    // Update match scores and status first
    const matchUpdateData = {
      team1_score: matchData.team1Score,
      team2_score: matchData.team2Score,
      status: matchData.status || 'completed',
      winner_team_id: matchData.winner_team_id,
      updated_at: new Date().toISOString()
    };

    const { data: updatedMatch, error: matchError } = await supabase
      .from('matches')
      .update(matchUpdateData)
      .eq('id', matchId)
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        winner_team:teams!matches_winner_team_id_fkey(*)
      `)
      .single();

    if (matchError) throw matchError;

    // Process ELO updates for players with enhanced error handling
    const historyRecords = [];
    const skillLevelChanges = [];
    
    for (const update of eloUpdates) {
      console.log(`Processing ELO update for player: ${update.playerId}`);
      
      // CRITICAL FIX: Enhanced player data fetching with validation
      const { data: currentPlayer, error: fetchError } = await supabase
        .from('players')
        .select('id, matches_played, matches_won, points, elo_games_played, elo_rating, peak_elo_rating')
        .eq('id', update.playerId)
        .single();

      // Handle fetch errors or missing player
      if (fetchError) {
        console.error(`Error fetching player ${update.playerId}:`, fetchError);
        // Try to continue with default values
        console.warn(`Using default values for player ${update.playerId}`);
        const defaultPlayer = {
          id: update.playerId,
          matches_played: 0,
          matches_won: 0,
          points: 0,
          elo_games_played: 0,
          elo_rating: 1500,
          peak_elo_rating: 1500
        };
        await this.processPlayerUpdate(update, defaultPlayer, matchId, wasAlreadyCompleted, historyRecords, skillLevelChanges);
        continue;
      }

      if (!currentPlayer) {
        console.error(`Player ${update.playerId} not found in database`);
        throw new Error(`Player ${update.playerId} not found`);
      }

      // Ensure all required properties exist with fallback values
      const safePlayer = {
        id: currentPlayer.id,
        matches_played: currentPlayer.matches_played || 0,
        matches_won: currentPlayer.matches_won || 0,
        points: currentPlayer.points || 0,
        elo_games_played: currentPlayer.elo_games_played || 0,
        elo_rating: currentPlayer.elo_rating || 1500,
        peak_elo_rating: currentPlayer.peak_elo_rating || currentPlayer.elo_rating || 1500
      };

      console.log(`Safe player data for ${update.playerId}:`, safePlayer);

      await this.processPlayerUpdate(update, safePlayer, matchId, wasAlreadyCompleted, historyRecords, skillLevelChanges);
    }

    // Record all ELO history and skill changes
    await this.recordEloHistory(historyRecords);
    await this.recordSkillChanges(skillLevelChanges);

    // Update team statistics if needed
    if (!wasAlreadyCompleted && updatedMatch.winner_team_id) {
      await this.updateTeamStatistics(updatedMatch);
    }

    console.log('ELO processing completed successfully');
    return updatedMatch;
    
  } catch (error) {
    console.error('Error in updateMatchWithElo:', error);
    throw error;
  }
}

// HELPER METHOD: Process individual player update
async processPlayerUpdate(update, currentPlayer, matchId, wasAlreadyCompleted, historyRecords, skillLevelChanges) {
  try {
    // Calculate new values with safe defaults
    const newEloGamesPlayed = wasAlreadyCompleted 
      ? currentPlayer.elo_games_played
      : currentPlayer.elo_games_played + 1;

    const newMatchesPlayed = wasAlreadyCompleted 
      ? currentPlayer.matches_played
      : currentPlayer.matches_played + 1;

    // Determine if player was winner (simplified logic)
    const isWinner = update.ratingChange > 0; // Positive rating change indicates win

    const newMatchesWon = wasAlreadyCompleted 
      ? currentPlayer.matches_won
      : isWinner 
        ? currentPlayer.matches_won + 1
        : currentPlayer.matches_won;

    const newPoints = wasAlreadyCompleted
      ? currentPlayer.points
      : isWinner 
        ? currentPlayer.points + 1
        : currentPlayer.points;

    // Update player with calculated values
    const { error: playerError } = await supabase
      .from('players')
      .update({
        elo_rating: update.newRating,
        peak_elo_rating: Math.max(update.newRating, currentPlayer.peak_elo_rating),
        skill_level: update.newSkillLevel,
        elo_games_played: newEloGamesPlayed,
        matches_played: newMatchesPlayed,
        matches_won: newMatchesWon,
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', update.playerId);

    if (playerError) {
      console.error('Error updating player:', update.playerId, playerError);
      throw playerError;
    }

    // Add to history records
    historyRecords.push({
      player_id: update.playerId,
      match_id: matchId,
      old_rating: update.oldRating,
      new_rating: update.newRating,
      rating_change: update.ratingChange,
      old_skill_level: update.oldSkillLevel,
      new_skill_level: update.newSkillLevel,
      opponent_avg_rating: update.opponentAvgRating,
      k_factor: update.kFactor
    });

    // Track skill level changes
    if (update.oldSkillLevel !== update.newSkillLevel) {
      skillLevelChanges.push({
        player_id: update.playerId,
        old_skill_level: update.oldSkillLevel,
        new_skill_level: update.newSkillLevel,
        elo_rating: update.newRating,
        reason: wasAlreadyCompleted ? 'Score correction ELO update' : 'Match completion ELO update',
        auto_applied: true
      });
    }

    console.log(`Successfully processed player update for ${update.playerId}`);
    
  } catch (error) {
    console.error(`Error processing player update for ${update.playerId}:`, error);
    throw error;
  }
}

// HELPER METHOD: Record ELO history
async recordEloHistory(historyRecords) {
  if (historyRecords.length > 0) {
    const { error: historyError } = await supabase
      .from('player_rating_history')
      .insert(historyRecords);
    
    if (historyError) {
      console.error('Error recording rating history:', historyError);
      throw historyError;
    }
  }
}

// HELPER METHOD: Record skill level changes
async recordSkillChanges(skillLevelChanges) {
  if (skillLevelChanges.length > 0) {
    const { error: skillError } = await supabase
      .from('skill_level_changes')
      .insert(skillLevelChanges);
    
    if (skillError) {
      console.error('Error recording skill changes:', skillError);
      throw skillError;
    }
  }
}

// HELPER METHOD: Update team statistics
async updateTeamStatistics(updatedMatch) {
  try {
    // Get current team stats for winner
    const { data: winningTeam, error: winTeamError } = await supabase
      .from('teams')
      .select('matches_played, matches_won, points')
      .eq('id', updatedMatch.winner_team_id)
      .single();

    if (winTeamError) throw winTeamError;

    // Update winning team
    await supabase
      .from('teams')
      .update({
        matches_played: (winningTeam.matches_played || 0) + 1,
        matches_won: (winningTeam.matches_won || 0) + 1,
        points: (winningTeam.points || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', updatedMatch.winner_team_id);

    // Update losing team
    const losingTeamId = updatedMatch.winner_team_id === updatedMatch.team1_id 
      ? updatedMatch.team2_id 
      : updatedMatch.team1_id;

    const { data: losingTeam, error: loseTeamError } = await supabase
      .from('teams')
      .select('matches_played')
      .eq('id', losingTeamId)
      .single();

    if (loseTeamError) throw loseTeamError;

    await supabase
      .from('teams')
      .update({
        matches_played: (losingTeam.matches_played || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', losingTeamId);

  } catch (error) {
    console.error('Error updating team statistics:', error);
    throw error;
  }
}


}

export const supabaseService = new SupabaseService();

