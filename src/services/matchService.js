import { supabase } from './supabaseService';
import { badmintonEloSystem } from '../utils/BadmintonEloSystem';
import { teamEloService } from './teamEloService';

export const matchService = {
  /**
   * Update a match with ELO rating processing in an optimized way
   */
  async updateMatchWithElo(matchId, matchData, eloUpdates, wasAlreadyCompleted = false) {
    try {
      console.log('Processing match update with ELO (including team ELO):', {
        matchId,
        wasAlreadyCompleted,
        playerEloUpdates: eloUpdates?.playerEloUpdates?.length || 0,
        teamEloUpdates: eloUpdates?.teamEloUpdates?.length || 0
      });

      // Extract player and team ELO updates
      const playerEloUpdates = eloUpdates?.playerEloUpdates || [];
      const teamEloUpdates = eloUpdates?.teamEloUpdates || [];
      // Validate player ELO updates array
      if (!Array.isArray(playerEloUpdates) || playerEloUpdates.length === 0) {
        console.warn('No player ELO updates provided, performing regular match update');
        return await this.updateMatch(matchId, matchData);
      }

      // Update the match first
      const { data: updatedMatch, error: matchError } = await supabase
        .from('matches')
        .update(matchData)
        .eq('id', matchId)
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (
            id,
            name,
            team_elo_rating,
            matches_played,
            team_players (
              players (
                id,
                name,
                elo_rating
              )
            )
          ),
          team2:teams!matches_team2_id_fkey (
            id,
            name,
            team_elo_rating,
            matches_played,
            team_players (
              players (
                id,
                name,
                elo_rating
              )
            )
          )
        `)
      .single();
    
      if (matchError) {
        console.error('Error updating match:', matchError);
        throw matchError;
      }

      // Get current player data for all affected players
      const playerIds = playerEloUpdates.map(update => update.playerId);
      const { data: currentPlayers, error: fetchError } = await supabase
        .from('players')
        .select('id, matches_played, matches_won, points, elo_games_played, elo_rating, peak_elo_rating, skill_level')
        .in('id', playerIds);

      if (fetchError) {
        console.error('Error fetching current player data:', fetchError);
        throw fetchError;
      }

      // Process player updates
      const playerUpdates = [];
      const playerHistoryRecords = [];

      for (const update of playerEloUpdates) {
        if (update.error) {
          console.warn(`Skipping player update due to error: ${update.error}`);
          continue;
        }

        const currentPlayer = currentPlayers.find(p => p.id === update.playerId);
        if (!currentPlayer) {
          console.warn(`Player ${update.playerId} not found, skipping update`);
          continue;
        }

        const newMatchesPlayed = wasAlreadyCompleted ?
          currentPlayer.matches_played :
          (currentPlayer.matches_played || 0) + 1;

        const newMatchesWon = wasAlreadyCompleted ?
          currentPlayer.matches_won :
          (currentPlayer.matches_won || 0) + (update.won ? 1 : 0);

        const newEloGamesPlayed = wasAlreadyCompleted ?
          currentPlayer.elo_games_played :
          (currentPlayer.elo_games_played || 0) + 1;

        const newPeakElo = Math.max(
          currentPlayer.peak_elo_rating || update.newRating,
          update.newRating
        );

        playerUpdates.push({
          id: update.playerId,
          matches_played: newMatchesPlayed,
          matches_won: newMatchesWon,
          elo_rating: update.newRating,
          peak_elo_rating: newPeakElo,
          elo_games_played: newEloGamesPlayed,
          skill_level: update.newSkillLevel
        });

        playerHistoryRecords.push({
          player_id: update.playerId,
          match_id: matchId,
          old_elo_rating: update.oldRating,
          new_elo_rating: update.newRating,
          elo_change: update.ratingChange,
          old_skill_level: update.oldSkillLevel,
          new_skill_level: update.newSkillLevel,
          elo_rating: Math.round(update.newRating),
          opponent_avg_rating: update.opponentAvgRating,
          reason: wasAlreadyCompleted ? 'Score correction ELO update' : 'Match completion ELO update',
          auto_applied: true
        });
      }

      // Update players
      if (playerUpdates.length > 0) {
        const { error: playerUpdateError } = await supabase
          .from('players')
          .upsert(playerUpdates);

        if (playerUpdateError) {
          console.error('Error updating players:', playerUpdateError);
          throw playerUpdateError;
        }
      }

      // Insert player rating history
      if (playerHistoryRecords.length > 0) {
        const { error: historyError } = await supabase
          .from('player_rating_history')
          .insert(playerHistoryRecords);

        if (historyError) {
          console.error('Error inserting player rating history:', historyError);
          // Don't throw here, continue with team processing
        }
      }

      // Process team ELO updates
      if (teamEloUpdates.length > 0) {
        console.log(`Processing ${teamEloUpdates.length} team ELO updates...`);

        const teamUpdates = [];

        for (const teamUpdate of teamEloUpdates) {
          if (teamUpdate.error) {
            console.warn(`Skipping team update due to error: ${teamUpdate.error}`);
            continue;
          }

          const newTeamGamesPlayed = wasAlreadyCompleted ?
            (updatedMatch.team1_id === teamUpdate.teamId ?
              updatedMatch.team1?.matches_played :
              updatedMatch.team2?.matches_played) || 0 :
            ((updatedMatch.team1_id === teamUpdate.teamId ?
              updatedMatch.team1?.matches_played :
              updatedMatch.team2?.matches_played) || 0) + 1;

          const currentTeamElo = updatedMatch.team1_id === teamUpdate.teamId ?
            updatedMatch.team1?.team_elo_rating :
            updatedMatch.team2?.team_elo_rating;

          const newPeakTeamElo = Math.max(
            currentTeamElo || teamUpdate.newRating,
            teamUpdate.newRating
          );

          teamUpdates.push({
            id: teamUpdate.teamId,
            team_elo_rating: teamUpdate.newRating,
            peak_team_elo_rating: newPeakTeamElo,
            team_elo_games_played: newTeamGamesPlayed
          });
        }

        // Update teams
        if (teamUpdates.length > 0) {
          const { error: teamUpdateError } = await supabase
            .from('teams')
            .upsert(teamUpdates);

          if (teamUpdateError) {
            console.error('Error updating teams:', teamUpdateError);
            // Don't throw here, log and continue
          } else {
            console.log(`Updated ${teamUpdates.length} teams with new ELO ratings`);
          }
        }

        // Record team ELO history
        await teamEloService.recordTeamEloChanges(matchId, teamEloUpdates);
      }

      console.log('Match update with ELO processing completed successfully');
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
    try {
    const { data, error } = await supabase
      .from('matches')
        .update(matchData)
        .eq('id', id)
      .select(`
        *,
          team1:teams!matches_team1_id_fkey (
            id,
            name,
            team_elo_rating,
            team_players (
              players (
                id,
                name,
                elo_rating
              )
            )
          ),
          team2:teams!matches_team2_id_fkey (
            id,
            name,
            team_elo_rating,
            team_players (
              players (
                id,
                name,
                elo_rating
              )
            )
          )
        `)
        .single();
    
      if (error) {
        console.error('Error updating match:', error);
        throw error;
      }
    
    return data;
    } catch (error) {
      console.error('Error in updateMatch:', error);
      throw error;
  }
  },

  /**
   * Create a new match with ELO processing
   */
  async createMatch(matchData) {
    try {
      // Insert basic match data
      const insertData = {
        ...matchData,
        status: matchData.status || 'scheduled'
};

      const { data: newMatch, error } = await supabase
        .from('matches')
        .insert(insertData)
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (
            id,
            name,
            team_elo_rating,
            team_players (
              players (
                id,
                name,
                elo_rating
              )
            )
          ),
          team2:teams!matches_team2_id_fkey (
            id,
            name,
            team_elo_rating,
            team_players (
              players (
                id,
                name,
                elo_rating
              )
            )
          )
        `)
        .single();

      if (error) {
        console.error('Error creating match:', error);
        throw error;
      }

      // Process ELO if scores were provided and match is completed
      if (insertData.status === 'completed' &&
          insertData.team1_score !== undefined &&
          insertData.team2_score !== undefined) {

        // Get team players for ELO calculation
        const team1Players = newMatch.team1?.team_players?.map(tp => tp.players) || [];
        const team2Players = newMatch.team2?.team_players?.map(tp => tp.players) || [];

        if (team1Players.length === 2 && team2Players.length === 2) {
          // Calculate ELO updates including team ELO
          const eloResult = badmintonEloSystem.processMatchResult(
            team1Players,
            team2Players,
            insertData.team1_score,
            insertData.team2_score,
            newMatch.team1, // Pass team data for team ELO
            newMatch.team2  // Pass team data for team ELO
          );

          // Update match with ELO processing
          return await this.updateMatchWithElo(newMatch.id, {}, eloResult, false);
        }
      }

      return newMatch;
    } catch (error) {
      console.error('Error in createMatch:', error);
      throw error;
    }
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
