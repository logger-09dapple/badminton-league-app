import { supabase } from '../services/supabaseService';
import { badmintonEloSystem } from './BadmintonEloSystem';

/**
 * Enhanced Sequential ELO Processor with detailed logging and win/loss verification
 * Fixes all identified issues:
 * 1. Enhanced win/loss detection with detailed logging
 * 2. ELO sync to fix chart vs player list mismatch
 * 3. Correct point calculation (3 for win, 1 for participation)
 * 4. Recent form calculation explanation
 */
export class EnhancedSequentialEloProcessor {
  constructor() {
    this.playerEloTracker = new Map();
    this.playerStatsTracker = new Map();
    this.processedMatches = [];
    this.errors = [];
    this.detailedLogs = [];
  }

  /**
   * Initialize player tracking with skill-based starting ratings and stats
   */
  initializePlayerTracking(players, matches) {
    console.log('🎯 Initializing enhanced player tracking...');
    
    this.playerEloTracker.clear();
    this.playerStatsTracker.clear();
    
    players.forEach(player => {
      // Initialize ELO tracking
      let initialElo = 1500; // Default
      
      if (player.skill_level) {
        const skillLevel = player.skill_level.toLowerCase();
        if (skillLevel === 'advanced') {
          initialElo = 1800;
        } else if (skillLevel === 'beginner') {
          initialElo = 1200;
        }
      }

      this.playerEloTracker.set(player.id, {
        currentElo: initialElo,
        gamesPlayed: 0,
        skillLevel: player.skill_level || 'Intermediate',
        name: player.name
      });

      // Initialize stats tracking
      this.playerStatsTracker.set(player.id, {
        name: player.name,
        matchesPlayed: 0,
        matchesWon: 0,
        points: 0, // League points: 3 for win, 1 for participation
        totalPointsScored: 0, // Badminton points scored
        totalMatchResults: [] // For recent form calculation
      });

      console.log(`   ${player.name}: Starting ELO = ${initialElo} (${player.skill_level || 'Intermediate'})`);
    });

    console.log(`✅ Initialized tracking for ${players.length} players`);
  }

  /**
   * Enhanced match processing with detailed win/loss verification
   */
  processMatch(match) {
    try {
      console.log(`\n🎮 ========== PROCESSING MATCH ==========`);
      console.log(`   Match ID: ${match.id}`);
      console.log(`   Teams: ${match.team1?.name} vs ${match.team2?.name}`);
      console.log(`   Score: ${match.team1_score}-${match.team2_score}`);
      console.log(`   Date: ${new Date(match.created_at).toLocaleString()}`);
      
      // Determine winner with detailed logging
      const team1Won = match.team1_score > match.team2_score;
      const winnerTeamId = match.winner_team_id;
      const expectedWinnerTeamId = team1Won ? match.team1_id : match.team2_id;
      
      console.log(`   🏆 Winner Analysis:`);
      console.log(`     Team 1 Won (by score): ${team1Won}`);
      console.log(`     Database Winner ID: ${winnerTeamId}`);
      console.log(`     Expected Winner ID: ${expectedWinnerTeamId}`);
      console.log(`     Winner Match: ${winnerTeamId === expectedWinnerTeamId ? '✅' : '❌ MISMATCH!'}`);
      
      if (winnerTeamId !== expectedWinnerTeamId) {
        console.error(`🚨 CRITICAL: Winner team ID mismatch in match ${match.id}`);
        this.detailedLogs.push({
          matchId: match.id,
          issue: 'Winner team ID mismatch',
          expected: expectedWinnerTeamId,
          actual: winnerTeamId,
          scores: `${match.team1_score}-${match.team2_score}`
        });
      }

      // Get players for both teams
      const team1Players = match.team1?.team_players?.map(tp => tp.players).filter(Boolean) || [];
      const team2Players = match.team2?.team_players?.map(tp => tp.players).filter(Boolean) || [];

      if (team1Players.length === 0 || team2Players.length === 0) {
        throw new Error('Missing player data');
      }

      console.log(`   👥 Players:`);
      console.log(`     Team 1 (${match.team1?.name}): ${team1Players.map(p => p.name).join(', ')}`);
      console.log(`     Team 2 (${match.team2?.name}): ${team2Players.map(p => p.name).join(', ')}`);

      // Build player objects with current sequential ELO
      const team1PlayersWithCurrentElo = team1Players.map(player => {
        const tracker = this.playerEloTracker.get(player.id);
        return {
          ...player,
          elo_rating: tracker ? tracker.currentElo : 1500,
          elo_games_played: tracker ? tracker.gamesPlayed : 0
        };
      });

      const team2PlayersWithCurrentElo = team2Players.map(player => {
        const tracker = this.playerEloTracker.get(player.id);
        return {
          ...player,
          elo_rating: tracker ? tracker.currentElo : 1500,
          elo_games_played: tracker ? tracker.gamesPlayed : 0
        };
      });

      console.log(`   📊 Current ELO Ratings:`);
      console.log(`     Team 1: ${team1PlayersWithCurrentElo.map(p => `${p.name}:${p.elo_rating}`).join(', ')}`);
      console.log(`     Team 2: ${team2PlayersWithCurrentElo.map(p => `${p.name}:${p.elo_rating}`).join(', ')}`);

      // Calculate ELO changes
      const eloResult = badmintonEloSystem.processMatchResult(
        team1PlayersWithCurrentElo,
        team2PlayersWithCurrentElo,
        match.team1_score,
        match.team2_score
      );

      if (!eloResult || !eloResult.playerEloUpdates) {
        throw new Error('No ELO updates generated');
      }

      console.log(`   🔄 ELO UPDATES:`);

      // Process each player update with detailed verification
      const historyRecords = [];
      
      eloResult.playerEloUpdates.forEach(update => {
        const eloTracker = this.playerEloTracker.get(update.playerId);
        const statsTracker = this.playerStatsTracker.get(update.playerId);
        
        if (eloTracker && statsTracker) {
          // Verify win/loss logic
          const isInTeam1 = team1Players.some(p => p.id === update.playerId);
          const actualWon = isInTeam1 ? team1Won : !team1Won;
          const eloSystemSaysWon = update.won;
          
          console.log(`     👤 ${update.playerName}:`);
          console.log(`       Team: ${isInTeam1 ? 'Team 1' : 'Team 2'} (${isInTeam1 ? match.team1?.name : match.team2?.name})`);
          console.log(`       Match Result: ${actualWon ? 'WON' : 'LOST'}`);
          console.log(`       ELO System Says: ${eloSystemSaysWon ? 'WON' : 'LOST'}`);
          console.log(`       Win/Loss Match: ${actualWon === eloSystemSaysWon ? '✅' : '❌ MISMATCH!'}`);
          console.log(`       ELO Change: ${update.oldRating} → ${update.newRating} (${update.ratingChange > 0 ? '+' : ''}${update.ratingChange})`);
          console.log(`       Expected Score: ${update.expectedScore.toFixed(3)}`);
          console.log(`       K-Factor: ${update.kFactor}`);
          
          // Check if ELO direction matches win/loss
          const eloDirectionCorrect = actualWon ? update.ratingChange > 0 : update.ratingChange < 0;
          if (!eloDirectionCorrect) {
            console.error(`       🚨 ELO DIRECTION ERROR: ${actualWon ? 'Won' : 'Lost'} but ELO ${update.ratingChange > 0 ? 'increased' : 'decreased'}`);
            this.detailedLogs.push({
              matchId: match.id,
              playerId: update.playerId,
              playerName: update.playerName,
              issue: 'ELO direction mismatch',
              won: actualWon,
              eloChange: update.ratingChange,
              expectedScore: update.expectedScore
            });
          }

          // Update ELO tracker
          eloTracker.currentElo = update.newRating;
          eloTracker.gamesPlayed += 1;

          // Update stats tracker
          statsTracker.matchesPlayed += 1;
          if (actualWon) {
            statsTracker.matchesWon += 1;
            statsTracker.points += 3; // Win = 3 points
          } else {
            statsTracker.points += 1; // Participation = 1 point
          }

          // Add badminton points scored
          if (isInTeam1) {
            statsTracker.totalPointsScored += match.team1_score || 0;
          } else {
            statsTracker.totalPointsScored += match.team2_score || 0;
          }

          // Track recent results for form calculation
          statsTracker.totalMatchResults.push({
            won: actualWon,
            date: match.created_at
          });

          // Keep only last 10 matches for form
          if (statsTracker.totalMatchResults.length > 10) {
            statsTracker.totalMatchResults = statsTracker.totalMatchResults.slice(-10);
          }

          // Create history record
          historyRecords.push({
            player_id: update.playerId,
            match_id: match.id,
            old_rating: update.oldRating,
            new_rating: update.newRating,
            rating_change: update.ratingChange,
            opponent_avg_rating: update.opponentAvgRating,
            old_skill_level: update.oldSkillLevel,
            new_skill_level: update.newSkillLevel,
            created_at: match.created_at
          });
        }
      });

      this.processedMatches.push({
        matchId: match.id,
        historyRecords: historyRecords
      });

      console.log(`   ✅ Match processed successfully`);

      return {
        success: true,
        historyRecords: historyRecords
      };

    } catch (error) {
      console.error(`💥 Error processing match ${match.id}:`, error);
      this.errors.push({
        matchId: match.id,
        error: error.message
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process all matches with enhanced logging
   */
  async processAllMatches(matches, players) {
    console.log('🚀 STARTING ENHANCED SEQUENTIAL ELO PROCESSING');
    console.log(`📊 Processing ${matches.length} matches for ${players.length} players`);

    // Initialize tracking
    this.initializePlayerTracking(players, matches);

    // Process matches chronologically
    let totalHistoryRecords = 0;
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      console.log(`\n📅 === MATCH ${i + 1}/${matches.length} ===`);
      
      const result = this.processMatch(match);
      if (result.success) {
        totalHistoryRecords += result.historyRecords.length;
      }
    }

    // Generate final statistics summary
    console.log('\n🎯 ========== PROCESSING SUMMARY ==========');
    console.log(`   Processed Matches: ${this.processedMatches.length}`);
    console.log(`   Failed Matches: ${this.errors.length}`);
    console.log(`   Total History Records: ${totalHistoryRecords}`);
    console.log(`   Issues Found: ${this.detailedLogs.length}`);

    // Show final ELO ratings
    console.log('\n📊 FINAL ELO RATINGS:');
    for (const [playerId, tracker] of this.playerEloTracker.entries()) {
      console.log(`   ${tracker.name}: ${tracker.currentElo} ELO (${tracker.gamesPlayed} games)`);
    }

    // Show final player statistics
    console.log('\n🏆 FINAL PLAYER STATISTICS:');
    for (const [playerId, stats] of this.playerStatsTracker.entries()) {
      const recentForm = this.calculateRecentForm(stats.totalMatchResults);
      console.log(`   ${stats.name}: ${stats.matchesWon}W/${stats.matchesPlayed - stats.matchesWon}L, ${stats.points} pts, Form: ${recentForm}`);
    }

    // Show issues if any
    if (this.detailedLogs.length > 0) {
      console.log('\n🚨 ISSUES DETECTED:');
      this.detailedLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.issue}:`);
        console.log(`      Player: ${log.playerName || 'N/A'}`);
        console.log(`      Match: ${log.matchId}`);
        console.log(`      Details: ${JSON.stringify(log, null, 2)}`);
      });
    }

    return {
      success: this.errors.length === 0,
      processedMatches: this.processedMatches.length,
      totalHistoryRecords: totalHistoryRecords,
      errors: this.errors,
      detailedLogs: this.detailedLogs,
      finalEloRatings: Array.from(this.playerEloTracker.entries()).map(([playerId, tracker]) => ({
        playerId,
        name: tracker.name,
        finalElo: tracker.currentElo,
        gamesPlayed: tracker.gamesPlayed
      })),
      finalPlayerStats: Array.from(this.playerStatsTracker.entries()).map(([playerId, stats]) => ({
        playerId,
        name: stats.name,
        matchesPlayed: stats.matchesPlayed,
        matchesWon: stats.matchesWon,
        points: stats.points,
        totalPointsScored: stats.totalPointsScored,
        recentForm: this.calculateRecentForm(stats.totalMatchResults)
      }))
    };
  }

  /**
   * Calculate recent form (last 5 matches)
   */
  calculateRecentForm(matchResults) {
    if (!matchResults || matchResults.length === 0) return 'N/A';
    
    // Get last 5 matches
    const recentMatches = matchResults.slice(-5);
    const wins = recentMatches.filter(result => result.won).length;
    
    return `${wins}/${recentMatches.length}`;
  }

  /**
   * Save everything to database with proper player stats sync
   */
  async saveEverythingToDatabase() {
    console.log('💾 Saving enhanced data to database...');

    // Save ELO history
    const historyResult = await this.saveEloHistoryToDatabase();
    
    // Update player ELO ratings
    const eloUpdateResult = await this.updatePlayerEloRatings();
    
    // Update player statistics
    const statsUpdateResult = await this.updatePlayerStatistics();

    return {
      success: historyResult.success && eloUpdateResult.success && statsUpdateResult.success,
      savedHistoryRecords: historyResult.savedRecords,
      updatedPlayerElos: eloUpdateResult.updatedPlayers,
      updatedPlayerStats: statsUpdateResult.updatedPlayers,
      errors: [
        ...historyResult.errors || [],
        ...eloUpdateResult.errors || [],
        ...statsUpdateResult.errors || []
      ]
    };
  }

  /**
   * Save ELO history to database
   */
  async saveEloHistoryToDatabase() {
    console.log('💾 Saving ELO history...');

    let savedRecords = 0;
    let errors = [];

    for (const processedMatch of this.processedMatches) {
      for (const record of processedMatch.historyRecords) {
        try {
          const { data: existing } = await supabase
            .from('player_rating_history')
            .select('id')
            .eq('player_id', record.player_id)
            .eq('match_id', record.match_id)
            .limit(1);

          if (existing && existing.length > 0) {
            continue; // Skip existing records
          }

          const { error: insertError } = await supabase
            .from('player_rating_history')
            .insert(record);

          if (insertError) {
            errors.push(`Failed to save ELO history: ${insertError.message}`);
          } else {
            savedRecords++;
          }
        } catch (error) {
          errors.push(`Error saving ELO record: ${error.message}`);
        }
      }
    }

    console.log(`✅ Saved ${savedRecords} ELO history records`);
    return { success: errors.length === 0, savedRecords, errors };
  }

  /**
   * Update player ELO ratings
   */
  async updatePlayerEloRatings() {
    console.log('🔄 Updating player ELO ratings...');

    let updatedPlayers = 0;
    let errors = [];

    for (const [playerId, tracker] of this.playerEloTracker.entries()) {
      try {
        const { error: updateError } = await supabase
          .from('players')
          .update({
            elo_rating: tracker.currentElo,
            elo_games_played: tracker.gamesPlayed,
            updated_at: new Date().toISOString()
          })
          .eq('id', playerId);

        if (updateError) {
          errors.push(`Failed to update ELO for ${tracker.name}: ${updateError.message}`);
        } else {
          console.log(`   ✅ ${tracker.name}: ELO=${tracker.currentElo}, Games=${tracker.gamesPlayed}`);
          updatedPlayers++;
        }
      } catch (error) {
        errors.push(`Error updating ELO for ${tracker.name}: ${error.message}`);
      }
    }

    console.log(`✅ Updated ${updatedPlayers} player ELO ratings`);
    return { success: errors.length === 0, updatedPlayers, errors };
  }

  /**
   * Update player statistics
   */
  async updatePlayerStatistics() {
    console.log('🔄 Updating player statistics...');

    let updatedPlayers = 0;
    let errors = [];

    for (const [playerId, stats] of this.playerStatsTracker.entries()) {
      try {
        const winPercentage = stats.matchesPlayed > 0 
          ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100) 
          : 0;

        const { error: updateError } = await supabase
          .from('players')
          .update({
            matches_played: stats.matchesPlayed,
            matches_won: stats.matchesWon,
            points: stats.points, // League points: 3 per win + 1 per match
            total_points_scored: stats.totalPointsScored,
            win_percentage: winPercentage,
            updated_at: new Date().toISOString()
          })
          .eq('id', playerId);

        if (updateError) {
          errors.push(`Failed to update stats for ${stats.name}: ${updateError.message}`);
        } else {
          console.log(`   ✅ ${stats.name}: ${stats.matchesWon}W/${stats.matchesPlayed}M, ${stats.points} pts`);
          updatedPlayers++;
        }
      } catch (error) {
        errors.push(`Error updating stats for ${stats.name}: ${error.message}`);
      }
    }

    console.log(`✅ Updated ${updatedPlayers} player statistics`);
    return { success: errors.length === 0, updatedPlayers, errors };
  }
}

/**
 * Main function to run enhanced sequential processing
 */
export const processEnhancedSequentialElo = async () => {
  try {
    console.log('🎯 STARTING ENHANCED SEQUENTIAL ELO PROCESSING');

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, skill_level, elo_rating');

    if (playersError) throw playersError;

    // Get all completed matches chronologically
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(
          id, name,
          team_players(player_id, players(id, name, skill_level))
        ),
        team2:teams!matches_team2_id_fkey(
          id, name,
          team_players(player_id, players(id, name, skill_level))
        )
      `)
      .eq('status', 'completed')
      .not('team1_score', 'is', null)
      .not('team2_score', 'is', null)
      .not('winner_team_id', 'is', null)
      .order('created_at', { ascending: true });

    if (matchesError) throw matchesError;

    console.log(`📊 Found ${players.length} players and ${matches.length} matches`);

    // Create enhanced processor
    const processor = new EnhancedSequentialEloProcessor();
    
    // Process all matches
    const processResult = await processor.processAllMatches(matches, players);
    
    if (!processResult.success) {
      console.error('❌ Processing failed:', processResult.errors);
      return processResult;
    }

    // Save everything to database
    const saveResult = await processor.saveEverythingToDatabase();

    console.log('🎉 ENHANCED SEQUENTIAL ELO PROCESSING COMPLETE!');

    return {
      success: processResult.success && saveResult.success,
      processedMatches: processResult.processedMatches,
      savedHistoryRecords: saveResult.savedHistoryRecords,
      updatedPlayerElos: saveResult.updatedPlayerElos,
      updatedPlayerStats: saveResult.updatedPlayerStats,
      finalEloRatings: processResult.finalEloRatings,
      finalPlayerStats: processResult.finalPlayerStats,
      detailedLogs: processResult.detailedLogs,
      errors: processResult.errors
    };

  } catch (error) {
    console.error('💥 Enhanced sequential ELO processing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Make available in browser console
if (typeof window !== 'undefined') {
  window.processEnhancedSequentialElo = processEnhancedSequentialElo;
  window.EnhancedSequentialEloProcessor = EnhancedSequentialEloProcessor;
}

export default { EnhancedSequentialEloProcessor, processEnhancedSequentialElo };