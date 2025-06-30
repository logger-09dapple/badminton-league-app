import { supabase } from './supabaseService';

/**
 * Optimized service for match operations
 */
export const matchService = {
  /**
   * Update a match with ELO rating processing in an optimized way
   */
  async updateMatchWithElo(matchId, matchData, eloUpdates, wasAlreadyCompleted = false) {
    try {
      console.log('Processing match update with ELO:', {
        matchId,
        wasAlreadyCompleted,
        eloUpdatesCount: eloUpdates?.length || 0
      });
      console.time('elo-processing'); // Start timing

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
        winner_team_id: matchData.winner_team_id || (matchData.team1Score > matchData.team2Score ? matchData.team1Id : matchData.team2Id),
        updated_at: new Date().toISOString()
      };

      // 1. Update match first so UI can be updated quickly
      console.time('match-update-db'); // Measure match update time
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
      console.timeEnd('match-update-db');

      if (matchError) throw matchError;

      // 2. Prepare batch operations for players updates
      console.time('player-updates'); // Measure player update time
      
      // Collect player IDs that need updating
      const playerIds = eloUpdates.map(update => update.playerId);
      
      // Get current player data in a single query (more efficient)
      const { data: currentPlayers, error: fetchError } = await supabase
        .from('players')
        .select('id, matches_played, matches_won, points, elo_games_played, elo_rating, peak_elo_rating, skill_level')
        .in('id', playerIds);
        
      if (fetchError) throw fetchError;
      
      // Create a map for easy lookup
      const playerMap = (currentPlayers || []).reduce((map, player) => {
        map[player.id] = player;
        return map;
      }, {});
      
      // Prepare history records and player updates
      const historyRecords = [];
      const playerUpdates = [];
      const skillLevelChanges = [];

      // Only do player stats updates if match wasn't already completed
      const updatePlayerStats = !wasAlreadyCompleted;
      
      for (const update of eloUpdates) {
        // Get current player data
        const currentPlayer = playerMap[update.playerId] || {
          id: update.playerId,
          matches_played: 0,
          matches_won: 0,
          points: 0,
          elo_games_played: 0,
          elo_rating: 1500,
          peak_elo_rating: 1500,
          skill_level: update.oldSkillLevel
        };
        
        // Determine if this player was on winning team
        const isWinner = update.ratingChange > 0;
        
        // Calculate new values
        const newEloGamesPlayed = updatePlayerStats 
          ? currentPlayer.elo_games_played + 1
          : currentPlayer.elo_games_played;

        const newMatchesPlayed = updatePlayerStats 
          ? currentPlayer.matches_played + 1
          : currentPlayer.matches_played;

        const newMatchesWon = updatePlayerStats && isWinner
          ? currentPlayer.matches_won + 1
          : currentPlayer.matches_won;

        const newPoints = updatePlayerStats && isWinner
          ? currentPlayer.points + 1
          : currentPlayer.points;
        
        const newPeakRating = Math.max(
          update.newRating,
          currentPlayer.peak_elo_rating || update.newRating
        );
        
        // Add player update
        playerUpdates.push({
          id: update.playerId,
          data: {
            elo_rating: update.newRating,
            peak_elo_rating: newPeakRating,
            skill_level: update.newSkillLevel,
            elo_games_played: newEloGamesPlayed,
            matches_played: newMatchesPlayed,
            matches_won: newMatchesWon,
            points: newPoints,
            updated_at: new Date().toISOString()
          }
        });
        
        // Add history record
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
      }
      
      // 3. Apply all player updates in parallel for better performance
      const playerUpdatePromises = playerUpdates.map(async ({id, data}) => {
        const { error } = await supabase
          .from('players')
          .update(data)
          .eq('id', id);
          
        if (error) throw error;
      });
      
      await Promise.all(playerUpdatePromises);
      
      // 4. Record history in a single batch
      if (historyRecords.length > 0) {
        const { error: historyError } = await supabase
          .from('player_rating_history')
          .insert(historyRecords);
        
        if (historyError) throw historyError;
      }
      
      // 5. Record skill changes in a single batch
      if (skillLevelChanges.length > 0) {
        const { error: skillError } = await supabase
          .from('skill_level_changes')
          .insert(skillLevelChanges);
        
        if (skillError) throw skillError;
      }
      console.timeEnd('player-updates');

      // 6. Update team statistics if this is a new completion
      if (!wasAlreadyCompleted && updatedMatch.winner_team_id) {
        console.time('team-updates');
        const winnerId = updatedMatch.winner_team_id;
        const loserId = winnerId === updatedMatch.team1_id 
          ? updatedMatch.team2_id 
          : updatedMatch.team1_id;
          
        // Get both teams in a single query
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, matches_played, matches_won, points')
          .in('id', [winnerId, loserId]);
          
        if (teamsError) throw teamsError;
        
        // Find winner and loser in the results
        const winner = teams.find(t => t.id === winnerId) || {
          matches_played: 0, matches_won: 0, points: 0 
        };
        
        const loser = teams.find(t => t.id === loserId) || { 
          matches_played: 0 
        };
        
        // Update winner
        const { error: winnerError } = await supabase
          .from('teams')
          .update({
            matches_played: (winner.matches_played || 0) + 1,
            matches_won: (winner.matches_won || 0) + 1,
            points: (winner.points || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', winnerId);
          
        if (winnerError) throw winnerError;
        
        // Update loser
        const { error: loserError } = await supabase
          .from('teams')
          .update({
            matches_played: (loser.matches_played || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', loserId);
          
        if (loserError) throw loserError;
        console.timeEnd('team-updates');
      }

      console.timeEnd('elo-processing');
      console.log('ELO processing completed successfully');
      return updatedMatch;
      
    } catch (error) {
      console.error('Error in updateMatchWithElo:', error);
      throw error;
    }
  },

  /**
   * Update a match (regular update without ELO processing)
   */
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
  },

  /**
   * Add a new match with optional scores
   */
  async addMatch(matchData) {
    const insertData = {
      team1_id: matchData.team1Id,
      team2_id: matchData.team2Id,
      scheduled_date: matchData.scheduledDate || null,
      status: matchData.status || 'scheduled'
    };

    // Add scores if provided
    if (matchData.team1Score !== undefined && matchData.team2Score !== undefined) {
      insertData.team1_score = matchData.team1Score;
      insertData.team2_score = matchData.team2Score;
      insertData.status = 'completed';
      insertData.winner_team_id = matchData.team1Score > matchData.team2Score 
        ? matchData.team1Id 
        : matchData.team2Id;
    }

    const { data, error } = await supabase
      .from('matches')
      .insert([insertData])
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*)
      `)
      .maybeSingle();
    
    if (error) throw error;
    
    // Process ELO if scores were provided
    if (insertData.status === 'completed') {
      // This would need implementation similar to updateMatchWithElo
      // For now we'll return the basic match
    }
    
    return data;
  }
};