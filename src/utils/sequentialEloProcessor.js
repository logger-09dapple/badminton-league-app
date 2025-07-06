import { supabase } from '../services/supabaseService';
import { badmintonEloSystem } from './BadmintonEloSystem';

/**
 * Sequential ELO Processor - Processes matches chronologically with proper ELO progression
 * This fixes the issue where all matches use current ELO instead of sequential updates
 */
export class SequentialEloProcessor {
  constructor() {
    this.playerEloTracker = new Map(); // Track each player's ELO progression
    this.processedMatches = [];
    this.errors = [];
  }

  /**
   * Initialize player ELO tracker with skill-based starting ratings
   */
  initializePlayerElo(players) {
    console.log('🎯 Initializing player ELO tracker...');
    
    this.playerEloTracker.clear();
    
    players.forEach(player => {
      let initialElo = 1500; // Default
      
      // Set skill-based initial ELO
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

      console.log(`   ${player.name}: Starting ELO = ${initialElo} (${player.skill_level || 'Intermediate'})`);
    });
  }

  /**
   * Process a single match with sequential ELO calculation
   */
  processMatch(match) {
    try {
      console.log(`\n🎮 Processing Match: ${match.team1?.name} vs ${match.team2?.name}`);
      console.log(`   Score: ${match.team1_score}-${match.team2_score}`);
      console.log(`   Winner: ${match.winner_team_id === match.team1_id ? match.team1?.name : match.team2?.name}`);

      // Get players for both teams
      const team1Players = match.team1?.team_players?.map(tp => tp.players).filter(Boolean) || [];
      const team2Players = match.team2?.team_players?.map(tp => tp.players).filter(Boolean) || [];

      if (team1Players.length === 0 || team2Players.length === 0) {
        throw new Error('Missing player data');
      }

      // Build player objects with CURRENT sequential ELO (not database ELO)
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

      console.log('   Team 1 ELOs:', team1PlayersWithCurrentElo.map(p => `${p.name}:${p.elo_rating}`).join(', '));
      console.log('   Team 2 ELOs:', team2PlayersWithCurrentElo.map(p => `${p.name}:${p.elo_rating}`).join(', '));

      // Calculate ELO changes using the proper ELO system
      const eloResult = badmintonEloSystem.processMatchResult(
        team1PlayersWithCurrentElo,
        team2PlayersWithCurrentElo,
        match.team1_score,
        match.team2_score
      );

      if (!eloResult || !eloResult.playerEloUpdates) {
        throw new Error('No ELO updates generated');
      }

      // Update our ELO tracker with new ratings
      const historyRecords = [];
      
      eloResult.playerEloUpdates.forEach(update => {
        const tracker = this.playerEloTracker.get(update.playerId);
        if (tracker) {
          console.log(`   📊 ${update.playerName}: ${update.oldRating} → ${update.newRating} (${update.ratingChange > 0 ? '+' : ''}${update.ratingChange}) [${update.won ? 'WIN' : 'LOSS'}]`);
          
          // Update tracker with new ELO
          tracker.currentElo = update.newRating;
          tracker.gamesPlayed += 1;

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
   * Process all matches sequentially
   */
  async processAllMatches(matches, players) {
    console.log('🚀 Starting Sequential ELO Processing...');
    console.log(`📊 Processing ${matches.length} matches for ${players.length} players`);

    // Initialize player ELO tracker
    this.initializePlayerElo(players);

    // Process matches in chronological order
    let totalHistoryRecords = 0;
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      console.log(`\n📅 Match ${i + 1}/${matches.length} (${new Date(match.created_at).toLocaleDateString()})`);
      
      const result = this.processMatch(match);
      if (result.success) {
        totalHistoryRecords += result.historyRecords.length;
      }
    }

    console.log('\n🎯 Sequential Processing Summary:');
    console.log(`   Processed Matches: ${this.processedMatches.length}`);
    console.log(`   Failed Matches: ${this.errors.length}`);
    console.log(`   Total History Records: ${totalHistoryRecords}`);

    // Show final ELO ratings
    console.log('\n📊 Final ELO Ratings:');
    for (const [playerId, tracker] of this.playerEloTracker.entries()) {
      console.log(`   ${tracker.name}: ${tracker.currentElo} (${tracker.gamesPlayed} games)`);
    }

    return {
      success: this.errors.length === 0,
      processedMatches: this.processedMatches.length,
      totalHistoryRecords: totalHistoryRecords,
      errors: this.errors,
      finalEloRatings: Array.from(this.playerEloTracker.entries()).map(([playerId, tracker]) => ({
        playerId,
        name: tracker.name,
        finalElo: tracker.currentElo,
        gamesPlayed: tracker.gamesPlayed
      }))
    };
  }

  /**
   * Save all history records to database
   */
  async saveToDatabase() {
    console.log('💾 Saving ELO history to database...');

    let savedRecords = 0;
    let saveErrors = 0;

    for (const processedMatch of this.processedMatches) {
      for (const record of processedMatch.historyRecords) {
        try {
          // Check if record already exists
          const { data: existing, error: checkError } = await supabase
            .from('player_rating_history')
            .select('id')
            .eq('player_id', record.player_id)
            .eq('match_id', record.match_id)
            .limit(1);

          if (checkError) {
            console.warn(`   ⚠️ Error checking existing record:`, checkError);
            continue;
          }

          if (existing && existing.length > 0) {
            console.log(`   🔄 Record already exists for player ${record.player_id} in match ${record.match_id}`);
            continue;
          }

          const { error: insertError } = await supabase
            .from('player_rating_history')
            .insert(record);

          if (insertError) {
            console.error(`   ❌ Failed to save record:`, insertError);
            saveErrors++;
          } else {
            savedRecords++;
          }
        } catch (error) {
          console.error(`   💥 Error saving record:`, error);
          saveErrors++;
        }
      }
    }

    console.log(`✅ Saved ${savedRecords} ELO history records, ${saveErrors} errors`);

    return {
      success: saveErrors === 0,
      savedRecords,
      saveErrors
    };
  }

  /**
   * Update player final ELO ratings in database
   */
  async updatePlayerEloRatings() {
    console.log('🔄 Updating player final ELO ratings...');

    let updatedPlayers = 0;
    let updateErrors = 0;

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
          console.error(`   ❌ Failed to update ${tracker.name}:`, updateError);
          updateErrors++;
        } else {
          console.log(`   ✅ Updated ${tracker.name}: ELO=${tracker.currentElo}, Games=${tracker.gamesPlayed}`);
          updatedPlayers++;
        }
      } catch (error) {
        console.error(`   💥 Error updating ${tracker.name}:`, error);
        updateErrors++;
      }
    }

    console.log(`✅ Updated ${updatedPlayers} players, ${updateErrors} errors`);

    return {
      success: updateErrors === 0,
      updatedPlayers,
      updateErrors
    };
  }
}

/**
 * Complete sequential ELO processing - main function to call
 */
export const processSequentialElo = async () => {
  try {
    console.log('🎯 STARTING SEQUENTIAL ELO PROCESSING');

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

    // Create processor and run
    const processor = new SequentialEloProcessor();
    
    // Process all matches
    const processResult = await processor.processAllMatches(matches, players);
    
    if (!processResult.success) {
      console.error('❌ Processing failed:', processResult.errors);
      return processResult;
    }

    // Save to database
    const saveResult = await processor.saveToDatabase();
    const updateResult = await processor.updatePlayerEloRatings();

    console.log('🎉 SEQUENTIAL ELO PROCESSING COMPLETE!');

    return {
      success: processResult.success && saveResult.success && updateResult.success,
      processedMatches: processResult.processedMatches,
      savedRecords: saveResult.savedRecords,
      updatedPlayers: updateResult.updatedPlayers,
      finalEloRatings: processResult.finalEloRatings,
      errors: processResult.errors
    };

  } catch (error) {
    console.error('💥 Sequential ELO processing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Make available in browser console
if (typeof window !== 'undefined') {
  window.processSequentialElo = processSequentialElo;
  window.SequentialEloProcessor = SequentialEloProcessor;
}

export default { SequentialEloProcessor, processSequentialElo };