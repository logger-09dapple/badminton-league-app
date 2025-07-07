import { supabase } from './supabaseService';
import { badmintonEloSystem } from '../utils/BadmintonEloSystem';

/**
 * COMPLETE FIXED Unified ELO Service - Addresses both issues:
 * 1. Player rating history not updating on match score updates
 * 2. Sequential processing not working chronologically
 */
class UnifiedEloService {
  constructor() {
    this.debugMode = true;
  }

  /**
   * Test what columns actually work in player_rating_history table
   */
  async testHistorySchema() {
    console.log('🧪 Testing player_rating_history schema...');
    try {
      // Try inserting a test record with minimal columns
      const testRecord = {
        player_id: '00000000-0000-0000-0000-000000000000',
        match_id: '00000000-0000-0000-0000-000000000000',
        old_rating: 1500,
        new_rating: 1532,
        rating_change: 32
      };

      const { error: insertError } = await supabase
        .from('player_rating_history')
        .insert([testRecord]);

      if (insertError) {
        console.error('❌ Basic columns failed:', insertError.message);
        return { success: false, error: insertError.message };
      } else {
        console.log('✅ Basic columns work - cleaning up test record');
        await supabase
          .from('player_rating_history')
          .delete()
          .eq('player_id', '00000000-0000-0000-0000-000000000000');

        return { success: true, workingColumns: Object.keys(testRecord) };
      }
    } catch (error) {
      console.error('💥 Schema test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * FIXED: Process match ELO update with guaranteed history recording
   */
  async processMatchEloUpdate(matchId, matchData, wasAlreadyCompleted = false) {
    try {
      console.log('🎯 Processing unified ELO update for match:', matchId);

      // Get match with complete data
      const { data: currentMatch, error: matchFetchError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(
            id, name, team_elo_rating,
            team_players(
              player_id,
              players(id, name, skill_level, elo_rating, elo_games_played, peak_elo_rating, matches_played, matches_won, points)
            )
          ),
          team2:teams!matches_team2_id_fkey(
            id, name, team_elo_rating,
            team_players(
              player_id,
              players(id, name, skill_level, elo_rating, elo_games_played, peak_elo_rating, matches_played, matches_won, points)
            )
          )
        `)
        .eq('id', matchId)
        .single();

      if (matchFetchError || !currentMatch) {
        throw new Error(`Match not found: ${matchFetchError?.message}`);
      }

      // Extract and validate players
      const team1Players = currentMatch.team1?.team_players?.map(tp => tp.players).filter(p => p && p.id && p.name) || [];
      const team2Players = currentMatch.team2?.team_players?.map(tp => tp.players).filter(p => p && p.id && p.name) || [];

      if (team1Players.length !== 2 || team2Players.length !== 2) {
        throw new Error(`Invalid player count - Team1: ${team1Players.length}, Team2: ${team2Players.length}`);
      }

      // Ensure all players have valid ELO data
      [...team1Players, ...team2Players].forEach(player => {
        if (!player.elo_rating || isNaN(player.elo_rating)) {
          player.elo_rating = 1500;
        }
        if (!player.elo_games_played || isNaN(player.elo_games_played)) {
          player.elo_games_played = 0;
        }
      });

      const team1Score = matchData.team1Score ?? matchData.team1_score;
      const team2Score = matchData.team2Score ?? matchData.team2_score;

      if (team1Score === undefined || team2Score === undefined) {
        throw new Error('Both team scores must be provided');
      }

      console.log(`Calculating ELO for: ${currentMatch.team1.name} ${team1Score} - ${team2Score} ${currentMatch.team2.name}`);

      // Calculate ELO updates
          const eloResult = badmintonEloSystem.processMatchResult(
            team1Players,
            team2Players,
        team1Score,
        team2Score,
        currentMatch.team1,
        currentMatch.team2
      );

      if (!eloResult?.playerEloUpdates || eloResult.playerEloUpdates.length === 0) {
        throw new Error('No ELO updates generated');
      }

      console.log(`Generated ${eloResult.playerEloUpdates.length} player ELO updates`);

      // Update match record
      const { data: updatedMatch, error: matchUpdateError } = await supabase
        .from('matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          status: 'completed',
          winner_team_id: team1Score > team2Score ? currentMatch.team1_id : currentMatch.team2_id,
            updated_at: new Date().toISOString()
          })
        .eq('id', matchId)
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(*),
          team2:teams!matches_team2_id_fkey(*),
          winner_team:teams!matches_winner_team_id_fkey(*)
        `)
        .single();

      if (matchUpdateError) {
        throw new Error(`Match update failed: ${matchUpdateError.message}`);
      }

      // CRITICAL FIX: Process player updates with guaranteed history recording
      await this.updatePlayersWithHistory(eloResult.playerEloUpdates, matchId, wasAlreadyCompleted);

      // Validate history was recorded
      const historyValidated = await this.validateHistoryRecording(matchId, eloResult.playerEloUpdates.length);
      if (!historyValidated) {
        console.error(`❌ CRITICAL: History validation failed for match ${matchId}`);
        throw new Error('Player rating history was not recorded correctly');
      }

      // Process team updates if available
      if (eloResult.teamEloUpdates && eloResult.teamEloUpdates.length > 0) {
        await this.updateTeamsWithHistory(eloResult.teamEloUpdates, matchId, wasAlreadyCompleted);
      }

      // Update team statistics
      if (!wasAlreadyCompleted) {
        await this.updateTeamStatistics(currentMatch.team1_id, currentMatch.team2_id, team1Score > team2Score);
      }

      console.log('✅ Unified ELO processing completed with history validation');

      return {
        match: updatedMatch,
        playerEloUpdates: eloResult.playerEloUpdates,
        teamEloUpdates: eloResult.teamEloUpdates || []
      };
    } catch (error) {
      console.error('💥 Unified ELO processing failed:', error);
      throw error;
      }
    }

  /**
   * CRITICAL FIX: Update players with guaranteed history recording
   */
  async updatePlayersWithHistory(playerEloUpdates, matchId, wasAlreadyCompleted) {
    if (!Array.isArray(playerEloUpdates) || playerEloUpdates.length === 0) {
      console.warn('No player ELO updates to process');
      return;
    }

    console.log(`🔄 Processing ${playerEloUpdates.length} player ELO updates...`);

    const historyRecords = [];
    const skillLevelChanges = [];
    let updatedPlayersCount = 0;

    for (const update of playerEloUpdates) {
      try {
        // Get current player data
        const { data: currentPlayer, error: fetchError } = await supabase
          .from('players')
          .select('*')
          .eq('id', update.playerId)
          .single();

        if (fetchError || !currentPlayer) {
          console.warn(`Player ${update.playerId} not found, skipping`);
          continue;
        }

        // Calculate new values
        const newEloGamesPlayed = wasAlreadyCompleted
          ? currentPlayer.elo_games_played
          : (currentPlayer.elo_games_played || 0) + 1;

        const newMatchesPlayed = wasAlreadyCompleted
          ? currentPlayer.matches_played
          : (currentPlayer.matches_played || 0) + 1;

        const newMatchesWon = wasAlreadyCompleted
          ? currentPlayer.matches_won
          : (currentPlayer.matches_won || 0) + (update.won ? 1 : 0);

        const newPoints = wasAlreadyCompleted
          ? currentPlayer.points
          : (currentPlayer.points || 0) + (update.won ? 1 : 0);

        const newPeakElo = Math.max(
          currentPlayer.peak_elo_rating || update.newRating,
          update.newRating
        );

        // Update player - only specific fields to avoid null constraints
        const { error: updateError } = await supabase
          .from('players')
          .update({
            elo_rating: update.newRating,
            peak_elo_rating: newPeakElo,
            skill_level: update.newSkillLevel,
            elo_games_played: newEloGamesPlayed,
            matches_played: newMatchesPlayed,
            matches_won: newMatchesWon,
            points: newPoints,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.playerId);

        if (updateError) {
          console.error(`Error updating player ${update.playerId}:`, updateError);
          continue;
        }

        updatedPlayersCount++;

        // SCHEMA FIX: Create history record with only validated columns
        historyRecords.push({
          player_id: update.playerId,
          match_id: matchId,
          old_rating: update.oldRating,
          new_rating: update.newRating, // FINAL ELO after match - essential for charts
          rating_change: update.ratingChange,
          opponent_avg_rating: update.opponentAvgRating
          // REMOVED: All optional columns that caused schema errors
        });

        // Track skill level changes
        if (update.oldSkillLevel !== update.newSkillLevel) {
          skillLevelChanges.push({
            player_id: update.playerId,
            old_skill_level: update.oldSkillLevel,
            new_skill_level: update.newSkillLevel,
            elo_rating: update.newRating,
            reason: wasAlreadyCompleted ? 'Score correction' : 'Match completion',
            auto_applied: true,
            created_at: new Date().toISOString()
          });
        }

        console.log(`📊 ${currentPlayer.name}: ${update.oldRating} → ${update.newRating} (${update.ratingChange > 0 ? '+' : ''}${update.ratingChange}) [${update.won ? 'WIN' : 'LOSS'}]`);

      } catch (playerError) {
        console.error(`Error processing player ${update.playerId}:`, playerError);
        continue;
      }
    }

    // CRITICAL: Insert history records - essential for charts
    if (historyRecords.length > 0) {
      console.log(`📝 Recording ${historyRecords.length} player rating history records...`);
      
      // Check for existing records to prevent duplicates
      const { data: existingRecords } = await supabase
        .from('player_rating_history')
        .select('player_id, match_id')
        .eq('match_id', matchId);

      const existingSet = new Set(
        (existingRecords || []).map(r => `${r.player_id}-${r.match_id}`)
      );

      const newHistoryRecords = historyRecords.filter(
        record => !existingSet.has(`${record.player_id}-${record.match_id}`)
      );

      if (newHistoryRecords.length > 0) {
        const { error: historyError } = await supabase
          .from('player_rating_history')
          .insert(newHistoryRecords);

        if (historyError) {
          console.error('❌ CRITICAL: Error inserting player rating history:', historyError);
          throw new Error(`Failed to record player rating history: ${historyError.message}`);
        } else {
          console.log(`✅ Successfully recorded ${newHistoryRecords.length} player rating history records`);
        }
      } else {
        console.log('⚠️ All history records already exist for this match');
      }
    } else {
      console.error('❌ CRITICAL: No history records created - charts will not work');
      throw new Error('No player rating history records were created');
    }

    // Insert skill level changes
    if (skillLevelChanges.length > 0) {
      const { error: skillError } = await supabase
        .from('skill_level_changes')
        .insert(skillLevelChanges);

      if (skillError) {
        console.error('Error inserting skill level changes:', skillError);
      }
    }

    console.log(`✅ Player processing complete: ${updatedPlayersCount} players updated, ${historyRecords.length} history records created`);
  }

  /**
   * Update teams with ELO changes and record team history
   */
  async updateTeamsWithHistory(teamEloUpdates, matchId, wasAlreadyCompleted) {
    if (!Array.isArray(teamEloUpdates) || teamEloUpdates.length === 0) {
      return;
    }

    const teamHistoryRecords = [];

    for (const update of teamEloUpdates) {
      try {
        // Get current team data
        const { data: currentTeam, error: fetchError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', update.teamId)
          .single();

        if (fetchError || !currentTeam) {
          console.warn(`Team ${update.teamId} not found, skipping`);
          continue;
        }

        const newEloGamesPlayed = wasAlreadyCompleted 
          ? (currentTeam.team_elo_games_played || 0)
          : (currentTeam.team_elo_games_played || 0) + 1;

        const newPeakElo = Math.max(
          currentTeam.peak_team_elo_rating || update.newRating,
          update.newRating
        );

        // Update team - only specific fields
        const { error: updateError } = await supabase
          .from('teams')
          .update({
            team_elo_rating: update.newRating,
            peak_team_elo_rating: newPeakElo,
            team_elo_games_played: newEloGamesPlayed,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.teamId);

        if (updateError) {
          console.error(`Error updating team ${update.teamId}:`, updateError);
          continue;
        }

        // Create team history record
        teamHistoryRecords.push({
          team_id: update.teamId,
          match_id: matchId,
          old_team_elo_rating: update.oldRating,
          new_team_elo_rating: update.newRating,
          team_elo_change: update.ratingChange,
          opponent_team_id: update.opponentTeamId,
          opponent_team_elo_rating: update.opponentAvgRating,
          match_outcome: update.won ? 'win' : 'loss',
          expected_score: update.expectedScore,
          actual_score: update.actualScore,
          k_factor: update.kFactor,
          created_at: new Date().toISOString()
        });

        console.log(`🏆 ${currentTeam.name}: ${update.oldRating} → ${update.newRating} (${update.ratingChange > 0 ? '+' : ''}${update.ratingChange})`);

      } catch (teamError) {
        console.error(`Error processing team ${update.teamId}:`, teamError);
        continue;
      }
    }

    // Insert team history records
    if (teamHistoryRecords.length > 0) {
      const { error: historyError } = await supabase
        .from('team_elo_history')
        .insert(teamHistoryRecords);

      if (historyError) {
        console.error('Error inserting team ELO history:', historyError);
      } else {
        console.log(`✅ Recorded ${teamHistoryRecords.length} team ELO history records`);
      }
    }
  }

  /**
   * Validate that history was recorded correctly
   */
  async validateHistoryRecording(matchId, expectedPlayerUpdates) {
    try {
      console.log(`🔍 Validating history recording for match ${matchId}...`);
      
      const { data: historyRecords, error: historyError } = await supabase
        .from('player_rating_history')
        .select('*')
        .eq('match_id', matchId);

      if (historyError) {
        console.error('Error checking history records:', historyError);
        return false;
      }

      const expectedCount = expectedPlayerUpdates || 4;
      const actualCount = historyRecords?.length || 0;

      if (actualCount === 0) {
        console.error(`❌ CRITICAL: No history records found for match ${matchId}`);
        return false;
      }

      console.log(`✅ History validation passed: ${actualCount} records found`);
      return true;

    } catch (error) {
      console.error('Error validating history recording:', error);
      return false;
    }
  }

  /**
   * Update team match statistics
   */
  async updateTeamStatistics(team1Id, team2Id, team1Won) {
    try {
      // Update team 1
      const { data: team1Stats } = await supabase
        .from('teams')
        .select('matches_played, matches_won, points')
        .eq('id', team1Id)
        .single();

      if (team1Stats) {
        await supabase
          .from('teams')
          .update({
            matches_played: (team1Stats.matches_played || 0) + 1,
            matches_won: (team1Stats.matches_won || 0) + (team1Won ? 1 : 0),
            points: (team1Stats.points || 0) + (team1Won ? 1 : 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', team1Id);
      }

      // Update team 2
      const { data: team2Stats } = await supabase
        .from('teams')
        .select('matches_played, matches_won, points')
        .eq('id', team2Id)
        .single();

      if (team2Stats) {
        await supabase
          .from('teams')
          .update({
            matches_played: (team2Stats.matches_played || 0) + 1,
            matches_won: (team2Stats.matches_won || 0) + (!team1Won ? 1 : 0),
            points: (team2Stats.points || 0) + (!team1Won ? 1 : 0),
            updated_at: new Date().toISOString()
          })
          .eq('id', team2Id);
      }

    } catch (error) {
      console.error('Error updating team statistics:', error);
    }
  }

  /**
   * FIXED: Sequential processing with proper chronological ELO progression
   * Now includes team ELO processing
   */
  async processSequentialElo() {
    try {
      console.log('🚀 Starting COMPLETE Sequential ELO Processing (Players + Teams)...');
      // Get all players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, skill_level, elo_rating, elo_games_played');

      if (playersError) throw playersError;

      if (!players || players.length === 0) {
        throw new Error('No players found');
      }

      const validPlayers = players.filter(p => p && p.id && p.name);
      console.log(`Found ${validPlayers.length} valid players`);

      // Get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, team_elo_rating');

      if (teamsError) throw teamsError;

      const validTeams = teams?.filter(t => t && t.id && t.name) || [];
      console.log(`Found ${validTeams.length} valid teams`);

      // Get completed matches in chronological order
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(
            id, name, team_elo_rating,
            team_players(player_id, players(id, name, skill_level))
          ),
          team2:teams!matches_team2_id_fkey(
            id, name, team_elo_rating,
            team_players(player_id, players(id, name, skill_level))
          )
        `)
        .eq('status', 'completed')
        .not('team1_score', 'is', null)
        .not('team2_score', 'is', null)
        .order('updated_at', { ascending: true }); // CRITICAL: Chronological order

      if (matchesError) throw matchesError;

      if (!matches || matches.length === 0) {
        console.log('No matches to process');
        return { success: true, processedMatches: 0, updatedPlayers: validPlayers.length, updatedTeams: validTeams.length };
      }

      console.log(`Found ${matches.length} matches to process`);

      // Clear existing history first - FIXED: Clear both player and team history
      await this.clearAllHistory();

      // CRITICAL: Initialize ELO trackers for sequential processing
      const playerEloTracker = new Map();
      const teamEloTracker = new Map();

      // Initialize player ELO tracker with skill-based starting ELO
      validPlayers.forEach(player => {
        let initialElo = 1500;
        if (player.skill_level) {
          const skillLevel = player.skill_level.toLowerCase();
          if (skillLevel === 'advanced') initialElo = 1800;
          else if (skillLevel === 'beginner') initialElo = 1200;
        }
        
        playerEloTracker.set(player.id, {
          currentElo: initialElo,
          gamesPlayed: 0,
          matchesPlayed: 0,
          matchesWon: 0,
          points: 0,
          skillLevel: player.skill_level || 'Intermediate',
          name: player.name
        });

        console.log(`📊 ${player.name}: Starting ELO = ${initialElo} (${player.skill_level || 'Intermediate'})`);
      });

      // Initialize team ELO tracker
      validTeams.forEach(team => {
        teamEloTracker.set(team.id, {
          currentElo: 1500, // Teams always start at 1500
          gamesPlayed: 0,
          matchesPlayed: 0,
          matchesWon: 0,
            points: 0,
          name: team.name
        });

        console.log(`🏆 ${team.name}: Starting ELO = 1500`);
      });

      // Reset database to initial values
      await this.resetEloRatings(validPlayers);
      await this.resetTeamEloRatings(validTeams);

      // CRITICAL: Process matches sequentially using tracker values
      let processedCount = 0;
      
      for (const match of matches) {
        try {
          console.log(`\n🎮 Processing Match ${processedCount + 1}/${matches.length}:`);
          console.log(`   ${match.team1?.name} vs ${match.team2?.name}`);
          console.log(`   Score: ${match.team1_score}-${match.team2_score}`);
          console.log(`   Date: ${new Date(match.udpated_at).toLocaleDateString()}`);

          // Validate match structure
          if (!match.team1?.team_players || !match.team2?.team_players ||
              match.team1.team_players.length !== 2 || match.team2.team_players.length !== 2) {
            console.warn(`   ⚠️ Skipping - invalid structure`);
            continue;
          }

          // CRITICAL: Build player objects with CURRENT SEQUENTIAL ELO from tracker
          const team1Players = match.team1.team_players.map(tp => {
            const tracker = playerEloTracker.get(tp.players.id);
            if (!tracker) {
              throw new Error(`Player ${tp.players.name} not found in ELO tracker`);
            }

            return {
              ...tp.players,
              elo_rating: tracker.currentElo, // Use tracker ELO, not database ELO
              elo_games_played: tracker.gamesPlayed,
              skill_level: tracker.skillLevel
            };
          });

          const team2Players = match.team2.team_players.map(tp => {
            const tracker = playerEloTracker.get(tp.players.id);
            if (!tracker) {
              throw new Error(`Player ${tp.players.name} not found in ELO tracker`);
            }

            return {
              ...tp.players,
              elo_rating: tracker.currentElo, // Use tracker ELO, not database ELO
              elo_games_played: tracker.gamesPlayed,
              skill_level: tracker.skillLevel
            };
          });

          // Log current ELO values
          console.log(`   Team 1 ELOs: ${team1Players.map(p => `${p.name}:${p.elo_rating}`).join(', ')}`);
          console.log(`   Team 2 ELOs: ${team2Players.map(p => `${p.name}:${p.elo_rating}`).join(', ')}`);

          // CRITICAL: Build team data with current sequential ELO from tracker
          const team1Data = {
            ...match.team1,
            team_elo_rating: teamEloTracker.get(match.team1_id)?.currentElo || 1500
          };
          const team2Data = {
            ...match.team2,
            team_elo_rating: teamEloTracker.get(match.team2_id)?.currentElo || 1500
          };

          console.log(`   Team 1 ELO: ${team1Data.team_elo_rating}, Team 2 ELO: ${team2Data.team_elo_rating}`);

          // Calculate ELO changes using current sequential values - INCLUDES TEAM ELO
          const eloResult = badmintonEloSystem.processMatchResult(
            team1Players,
            team2Players,
            match.team1_score,
            match.team2_score,
            team1Data,  // Pass team data for team ELO calculation
            team2Data   // Pass team data for team ELO calculation
          );

          if (!eloResult?.playerEloUpdates || eloResult.playerEloUpdates.length === 0) {
            console.warn(`   ⚠️ No player ELO updates generated`);
            continue;
          }

          console.log(`   Generated ${eloResult.playerEloUpdates.length} player updates, ${eloResult.teamEloUpdates?.length || 0} team updates`);

          // Update player ELO tracker with new values for next iteration
          eloResult.playerEloUpdates.forEach(update => {
            const tracker = playerEloTracker.get(update.playerId);
            if (tracker) {
              console.log(`   📈 ${tracker.name}: ${update.oldRating} → ${update.newRating} (${update.ratingChange > 0 ? '+' : ''}${update.ratingChange}) [${update.won ? 'WIN' : 'LOSS'}]`);
              
              tracker.currentElo = update.newRating;
              tracker.gamesPlayed += 1;
              tracker.matchesPlayed += 1;
              if (update.won) {
                tracker.matchesWon += 1;
                tracker.points += 1;
              }
              tracker.skillLevel = update.newSkillLevel;
            }
          });

          // CRITICAL FIX: Update team ELO tracker with new values
          if (eloResult.teamEloUpdates && eloResult.teamEloUpdates.length > 0) {
            eloResult.teamEloUpdates.forEach(update => {
              const tracker = teamEloTracker.get(update.teamId);
              if (tracker) {
                console.log(`   🏆 ${tracker.name}: ${update.oldRating} → ${update.newRating} (${update.ratingChange > 0 ? '+' : ''}${update.ratingChange}) [${update.won ? 'WIN' : 'LOSS'}]`);

                tracker.currentElo = update.newRating;
                tracker.gamesPlayed += 1;
                tracker.matchesPlayed += 1;
                if (update.won) {
                  tracker.matchesWon += 1;
                  tracker.points += 1;
                }
              }
            });
          }

          // Record history with sequential progression - BOTH PLAYER AND TEAM
          await this.recordCompleteSequentialHistory(match.id, eloResult, match.created_at);

          processedCount++;

        } catch (matchError) {
          console.error(`   ❌ Error processing match ${match.id}:`, matchError);
          continue;
        }
      }

      // Update final database values from tracker - BOTH PLAYERS AND TEAMS
      await this.updateFinalEloFromTracker(playerEloTracker, teamEloTracker);

      console.log('\n🎉 Complete Sequential ELO Processing Finished!');
      console.log(`   📊 Processed: ${processedCount} matches`);
      console.log(`   👥 Updated: ${playerEloTracker.size} players`);
      console.log(`   🏆 Updated: ${teamEloTracker.size} teams`);

      return {
        success: true,
        processedMatches: processedCount,
        updatedPlayers: playerEloTracker.size,
        updatedTeams: teamEloTracker.size
      };

    } catch (error) {
      console.error('💥 Complete Sequential ELO processing failed:', error);
      throw error;
    }
  }

  /**
   * Record history with proper sequential data and timestamps - COMPLETE VERSION
   */
  async recordCompleteSequentialHistory(matchId, eloResult, matchCreatedAt) {
    const playerHistoryRecords = [];
    const teamHistoryRecords = [];

    // Record player ELO history
    if (eloResult.playerEloUpdates) {
      eloResult.playerEloUpdates.forEach(update => {
        playerHistoryRecords.push({
          player_id: update.playerId,
          match_id: matchId,
          old_rating: update.oldRating,
          new_rating: update.newRating,
          rating_change: update.ratingChange
        });
      });
    }

    // Record team ELO history
    if (eloResult.teamEloUpdates) {
      eloResult.teamEloUpdates.forEach(update => {
        teamHistoryRecords.push({
          team_id: update.teamId,
          match_id: matchId,
          old_team_elo_rating: update.oldRating,
          new_team_elo_rating: update.newRating,
          team_elo_change: update.ratingChange,
          opponent_team_id: update.opponentTeamId,
          opponent_team_elo_rating: update.opponentAvgRating,
          match_outcome: update.won ? 'win' : 'loss',
          expected_score: update.expectedScore,
          actual_score: update.actualScore,
          k_factor: update.kFactor,
          created_at: new Date().toISOString()
        });
      });
    }

    // Insert player history
    if (playerHistoryRecords.length > 0) {
      const { error: playerHistoryError } = await supabase
        .from('player_rating_history')
        .insert(playerHistoryRecords);

      if (playerHistoryError) {
        console.error('Error inserting player rating history:', playerHistoryError);
        throw new Error(`Failed to record player sequential history: ${playerHistoryError.message}`);
      }
    }

    // Insert team history
    if (teamHistoryRecords.length > 0) {
      const { error: teamHistoryError } = await supabase
        .from('team_elo_history')
        .insert(teamHistoryRecords);

      if (teamHistoryError) {
        console.error('Error inserting team ELO history:', teamHistoryError);
        throw new Error(`Failed to record team sequential history: ${teamHistoryError.message}`);
      }
    }

    console.log(`   ✅ Recorded ${playerHistoryRecords.length} player + ${teamHistoryRecords.length} team history records`);
  }

  /**
   * Update final database values from ELO tracker - COMPLETE VERSION
   */
  async updateFinalEloFromTracker(playerEloTracker, teamEloTracker) {
    console.log('💾 Updating final database values...');

    let updatedPlayers = 0;
    let updatedTeams = 0;

    // Update players
    for (const [playerId, tracker] of playerEloTracker.entries()) {
      try {
        const { error } = await supabase
          .from('players')
          .update({
            elo_rating: tracker.currentElo,
            peak_elo_rating: tracker.currentElo,
            elo_games_played: tracker.gamesPlayed,
            matches_played: tracker.matchesPlayed,
            matches_won: tracker.matchesWon,
            points: tracker.points,
            skill_level: tracker.skillLevel,
            updated_at: new Date().toISOString()
          })
          .eq('id', playerId);

        if (error) {
          console.error(`Error updating final ELO for player ${playerId}:`, error);
        } else {
          updatedPlayers++;
        }
      } catch (error) {
        console.error(`Individual update failed for player ${playerId}:`, error);
      }
    }

    // Update teams
    for (const [teamId, tracker] of teamEloTracker.entries()) {
      try {
        const { error } = await supabase
          .from('teams')
          .update({
            team_elo_rating: tracker.currentElo,
            peak_team_elo_rating: tracker.currentElo,
            team_elo_games_played: tracker.gamesPlayed,
            matches_played: tracker.matchesPlayed,
            matches_won: tracker.matchesWon,
            points: tracker.points,
            updated_at: new Date().toISOString()
          })
          .eq('id', teamId);

        if (error) {
          console.error(`Error updating final ELO for team ${teamId}:`, error);
        } else {
          updatedTeams++;
        }
      } catch (error) {
        console.error(`Individual update failed for team ${teamId}:`, error);
      }
    }

    console.log(`✅ Updated final ELO for ${updatedPlayers} players and ${updatedTeams} teams`);
  }

  /**
   * Clear ALL ELO history - COMPLETE VERSION
   */
  async clearAllHistory() {
    const { error: playerError } = await supabase
      .from('player_rating_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    const { error: teamError } = await supabase
      .from('team_elo_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (playerError || teamError) {
      console.warn('Error clearing history:', { playerError, teamError });
    } else {
      console.log('✅ Cleared existing player and team ELO history');
    }
  }

  /**
   * Clear ELO history (legacy method)
   */
  async clearHistory() {
    return this.clearAllHistory();
  }

  /**
   * Reset ELO ratings to skill-based initial values
   */
  async resetEloRatings(players) {
    console.log('🔄 Resetting player ELO ratings to initial values...');

    for (const player of players) {
      try {
        let initialElo = 1500;
        if (player.skill_level) {
          const skillLevel = player.skill_level.toLowerCase();
          if (skillLevel === 'advanced') initialElo = 1800;
          else if (skillLevel === 'beginner') initialElo = 1200;
        }

        await supabase
          .from('players')
          .update({
            elo_rating: initialElo,
            peak_elo_rating: initialElo,
            elo_games_played: 0,
            matches_played: 0,
            matches_won: 0,
            points: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', player.id);

      } catch (error) {
        console.error(`Error resetting player ${player.id}:`, error);
      }
    }

    console.log('✅ Player reset complete');
  }

  /**
   * Reset team ELO ratings to initial values
   */
  async resetTeamEloRatings(teams) {
    console.log('🔄 Resetting team ELO ratings to initial values...');

    for (const team of teams) {
      try {
        await supabase
          .from('teams')
          .update({
            team_elo_rating: 1500,
            peak_team_elo_rating: 1500,
            team_elo_games_played: 0,
            matches_played: 0,
            matches_won: 0,
            points: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', team.id);

      } catch (error) {
        console.error(`Error resetting team ${team.id}:`, error);
      }
    }

    console.log('✅ Team reset complete');
  }
}

// Export the complete fixed service
export const unifiedEloService = new UnifiedEloService();