import { supabase } from './supabaseService';
import { badmintonEloSystem } from '../utils/BadmintonEloSystem';
import { eloSystemManager } from './eloSystemManager'; // Import the system manager

/**
 * Team ELO Processor - Handles team-specific ELO processing
 * This addresses the issue where team ELO history wasn't being populated
 */
class TeamEloProcessor {
  constructor() {
    this.debugMode = true;
  }

  /**
   * Process team ELO for all completed matches sequentially
   */
  async processTeamEloSequentially() {
    try {
      console.log('🏆 Starting Team ELO Sequential Processing...');

      // Get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, team_elo_rating');

      if (teamsError) throw teamsError;

      const validTeams = teams?.filter(t => t && t.id && t.name) || [];
      if (validTeams.length === 0) {
        throw new Error('No teams found');
      }

      console.log(`Found ${validTeams.length} teams to process`);

      // Get completed matches in chronological order
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(
            id, name, team_elo_rating,
            team_players(player_id, players(id, name, skill_level, elo_rating, elo_games_played))
          ),
          team2:teams!matches_team2_id_fkey(
            id, name, team_elo_rating,
            team_players(player_id, players(id, name, skill_level, elo_rating, elo_games_played))
          )
        `)
        .eq('status', 'completed')
        .not('team1_score', 'is', null)
        .not('team2_score', 'is', null)
        .order('created_at', { ascending: true });

      if (matchesError) throw matchesError;

      if (!matches || matches.length === 0) {
        console.log('No matches to process');
        return { success: true, processedMatches: 0, updatedTeams: validTeams.length };
      }

      console.log(`Found ${matches.length} matches to process for team ELO`);

      // Clear existing team ELO history
      await this.clearTeamEloHistory();

      // Initialize team ELO tracker
      const teamEloTracker = new Map();
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

      // Reset team ELO ratings to initial values
      await this.resetTeamEloRatings(validTeams);

      // Process matches sequentially for team ELO
      let processedCount = 0;
      
      for (const match of matches) {
        try {
          console.log(`\n🏆 Processing Team Match ${processedCount + 1}/${matches.length}:`);
          console.log(`   ${match.team1?.name} vs ${match.team2?.name}`);
          console.log(`   Score: ${match.team1_score}-${match.team2_score}`);

          // Validate match structure
          if (!match.team1?.team_players || !match.team2?.team_players ||
              match.team1.team_players.length !== 2 || match.team2.team_players.length !== 2) {
            console.warn(`   ⚠️ Skipping - invalid structure`);
            continue;
          }

          // Get players with current ELO (for ELO system calculation)
          const team1Players = match.team1.team_players.map(tp => ({
            ...tp.players,
            elo_rating: tp.players.elo_rating || 1500,
            elo_games_played: tp.players.elo_games_played || 0
          }));

          const team2Players = match.team2.team_players.map(tp => ({
            ...tp.players,
            elo_rating: tp.players.elo_rating || 1500,
            elo_games_played: tp.players.elo_games_played || 0
          }));

          // Build team data with current sequential ELO from tracker
          const team1Data = {
            ...match.team1,
            team_elo_rating: teamEloTracker.get(match.team1_id)?.currentElo || 1500
          };
          const team2Data = {
            ...match.team2,
            team_elo_rating: teamEloTracker.get(match.team2_id)?.currentElo || 1500
          };

          console.log(`   Team 1 ELO: ${team1Data.team_elo_rating}, Team 2 ELO: ${team2Data.team_elo_rating}`);

          // Calculate ELO changes - focus on team ELO using selected system
          const eloResult = eloSystemManager.processMatch(
            team1Players,
            team2Players,
            match.team1_score,
            match.team2_score,
            team1Data,  // Pass team data for team ELO calculation
            team2Data   // Pass team data for team ELO calculation
          );

          // We only care about team ELO updates for this processor
          if (!eloResult?.teamEloUpdates || eloResult.teamEloUpdates.length === 0) {
            console.warn(`   ⚠️ No team ELO updates generated`);
            continue;
          }

          console.log(`   Generated ${eloResult.teamEloUpdates.length} team ELO updates`);

          // Update team ELO tracker with new values
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

          // Record team ELO history
          await this.recordTeamEloHistory(match.id, eloResult.teamEloUpdates, match.created_at);

          processedCount++;

          if (processedCount % 10 === 0) {
            console.log(`   📊 Processed ${processedCount}/${matches.length} matches...`);
          }

        } catch (matchError) {
          console.error(`   ❌ Error processing match ${match.id}:`, matchError);
          continue;
        }
      }

      // Update final team ELO ratings in database
      await this.updateFinalTeamEloRatings(teamEloTracker);

      console.log('\n🎉 Team ELO Sequential Processing Complete!');
      console.log(`   📊 Processed: ${processedCount} matches`);
      console.log(`   🏆 Updated: ${teamEloTracker.size} teams`);

      // Show final team ELO summary
      console.log('\n📈 Final Team ELO Ratings:');
      for (const [teamId, tracker] of teamEloTracker.entries()) {
        console.log(`   ${tracker.name}: ${tracker.currentElo} ELO (${tracker.gamesPlayed} games, ${tracker.matchesWon} wins)`);
      }

      return {
        success: true,
        processedMatches: processedCount,
        updatedTeams: teamEloTracker.size
      };

    } catch (error) {
      console.error('💥 Team ELO sequential processing failed:', error);
      throw error;
    }
  }

  /**
   * Clear existing team ELO history
   */
  async clearTeamEloHistory() {
    console.log('🗑️ Clearing team ELO history...');
    
    const { error } = await supabase
      .from('team_elo_history')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.warn('Error clearing team history:', error);
    } else {
      console.log('✅ Cleared team ELO history');
    }
  }

  /**
   * Reset team ELO ratings to initial values
   */
  async resetTeamEloRatings(teams) {
    console.log('🔄 Resetting team ELO ratings...');
    
    for (const team of teams) {
      try {
        await supabase
          .from('teams')
          .update({
            team_elo_rating: 1500,
            peak_team_elo_rating: 1500,
            team_elo_games_played: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', team.id);

      } catch (error) {
        console.error(`Error resetting team ${team.id}:`, error);
      }
    }

    console.log(`✅ Reset ELO for ${teams.length} teams`);
  }

  /**
   * Record team ELO history for a match
   */
  async recordTeamEloHistory(matchId, teamEloUpdates, matchCreatedAt) {
    if (!teamEloUpdates || teamEloUpdates.length === 0) {
      return;
    }

    const teamHistoryRecords = [];

    // Check for existing team records for this match to avoid duplicates
    const { data: existingTeamRecords } = await supabase
      .from('team_elo_history')
      .select('team_id, match_id')
      .eq('match_id', matchId);

    const existingTeamSet = new Set(
      (existingTeamRecords || []).map(r => `${r.team_id}-${r.match_id}`)
    );

    teamEloUpdates.forEach(update => {
      const recordKey = `${update.teamId}-${matchId}`;
      if (!existingTeamSet.has(recordKey)) {
        teamHistoryRecords.push({
          team_id: update.teamId,
          match_id: matchId,
          old_team_elo_rating: update.oldRating,
          new_team_elo_rating: update.newRating,
          team_elo_change: update.ratingChange,
          opponent_team_id: update.opponentTeamId,
          opponent_team_elo_rating: update.opponentAvgRating,
          match_outcome: update.won ? 'win' : 'loss',
          k_factor: update.kFactor || 24,
          expected_score: update.expectedScore || 0.5,
          actual_score: update.actualScore || (update.won ? 1 : 0),
          created_at: matchCreatedAt
        });
      } else {
        console.log(`   ⚠️ Skipping duplicate team record: ${update.teamId}`);
      }
    });

    if (teamHistoryRecords.length > 0) {
      const { error: teamHistoryError } = await supabase
        .from('team_elo_history')
        .insert(teamHistoryRecords);

      if (teamHistoryError) {
        console.error('❌ Error inserting team ELO history:', teamHistoryError);
        throw new Error(`Failed to record team history: ${teamHistoryError.message}`);
      } else {
        console.log(`   ✅ Recorded ${teamHistoryRecords.length} team history records`);
      }
    }
  }

  /**
   * Update final team ELO ratings in database
   */
  async updateFinalTeamEloRatings(teamEloTracker) {
    console.log('💾 Updating final team ELO ratings...');

    let updatedTeams = 0;
    for (const [teamId, tracker] of teamEloTracker.entries()) {
      try {
        const { error } = await supabase
          .from('teams')
          .update({
            team_elo_rating: tracker.currentElo,
            peak_team_elo_rating: Math.max(tracker.currentElo, tracker.currentElo),
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
          console.log(`   ✅ Updated ${tracker.name}: ELO=${tracker.currentElo}, Games=${tracker.gamesPlayed}`);
        }
      } catch (error) {
        console.error(`Individual update failed for team ${teamId}:`, error);
      }
    }

    console.log(`✅ Updated final ELO for ${updatedTeams} teams`);
  }

  /**
   * Process complete ELO (both players and teams) avoiding duplicates
   */
  async processCompleteElo() {
    try {
      console.log('🎯 Starting COMPLETE ELO Processing (Players + Teams, No Duplicates)...');

      // First, process team ELO only (this doesn't interfere with existing player data)
      const teamResult = await this.processTeamEloSequentially();

      if (!teamResult.success) {
        throw new Error('Team ELO processing failed');
      }

      console.log('\n✅ Complete ELO processing finished successfully!');
      console.log(`   📊 Processed: ${teamResult.processedMatches} matches`);
      console.log(`   🏆 Updated: ${teamResult.updatedTeams} teams`);
      console.log(`   👥 Player ELO: Using existing data (not duplicated)`);

      return {
        success: true,
        processedMatches: teamResult.processedMatches,
        updatedTeams: teamResult.updatedTeams,
        updatedPlayers: 0, // We're not updating players to avoid duplicates
        message: 'Complete ELO processing finished - team ELO history populated'
      };

    } catch (error) {
      console.error('💥 Complete ELO processing failed:', error);
      throw error;
    }
  }
}

// Create and export the team ELO processor
export const teamEloProcessor = new TeamEloProcessor();