import { supabase } from '../services/supabaseService';
import { teamEloSystem } from './TeamEloSystem';

/**
 * Sequential Team ELO Processor - Processes team matches chronologically with proper ELO progression
 */
export class SequentialTeamEloProcessor {
  constructor() {
    this.teamEloTracker = new Map(); // Track each team's ELO progression
    this.processedMatches = [];
    this.errors = [];
  }

  /**
   * Initialize team ELO tracker with starting ratings (1500 for all teams)
   */
  initializeTeamElo(teams) {
    console.log('🏆 Initializing team ELO tracker...');
    
    this.teamEloTracker.clear();
    
    teams.forEach(team => {
      const initialElo = 1500; // All teams start at 1500
      
      this.teamEloTracker.set(team.id, {
        currentElo: initialElo,
        peakElo: initialElo,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        name: team.name
      });

      console.log(`   ${team.name}: Starting ELO = ${initialElo}`);
    });
  }

  /**
   * Process a single match with sequential team ELO calculation
   */
  processMatch(match) {
    try {
      console.log(`\n🏆 Processing Team Match: ${match.team1?.name} vs ${match.team2?.name}`);
      console.log(`   Score: ${match.team1_score}-${match.team2_score}`);
      console.log(`   Winner: ${match.winner_team_id === match.team1_id ? match.team1?.name : match.team2?.name}`);

      const team1Id = match.team1_id;
      const team2Id = match.team2_id;

      if (!team1Id || !team2Id) {
        throw new Error('Missing team IDs');
      }

      // Get current ELO ratings from tracker
      const team1Tracker = this.teamEloTracker.get(team1Id);
      const team2Tracker = this.teamEloTracker.get(team2Id);

      if (!team1Tracker || !team2Tracker) {
        throw new Error('Team not found in tracker');
      }

      const team1CurrentElo = team1Tracker.currentElo;
      const team2CurrentElo = team2Tracker.currentElo;

      console.log(`   Team ELOs: ${match.team1?.name}:${team1CurrentElo}, ${match.team2?.name}:${team2CurrentElo}`);

      // Build team data objects with current sequential ELO
      const team1Data = {
        id: team1Id,
        name: match.team1?.name,
        team_elo_rating: team1CurrentElo,
        team_elo_games_played: team1Tracker.gamesPlayed
      };

      const team2Data = {
        id: team2Id,
        name: match.team2?.name,
        team_elo_rating: team2CurrentElo,
        team_elo_games_played: team2Tracker.gamesPlayed
      };

      // Calculate team ELO changes
      const teamEloUpdates = teamEloSystem.processTeamMatchResult(
        team1Data,
        team2Data,
        match.team1_score,
        match.team2_score
      );

      if (!teamEloUpdates || teamEloUpdates.length === 0) {
        throw new Error('No team ELO updates generated');
      }

      // Update our ELO tracker with new ratings
      const historyRecords = [];
      
      teamEloUpdates.forEach(update => {
        const tracker = this.teamEloTracker.get(update.teamId);
        if (tracker) {
          const isWin = match.winner_team_id === update.teamId;
          
          console.log(`   🏆 ${update.teamName}: ${update.oldElo} → ${update.newElo} (${update.eloChange > 0 ? '+' : ''}${update.eloChange}) [${isWin ? 'WIN' : 'LOSS'}]`);
          
          // Update tracker with new ELO
          tracker.currentElo = update.newElo;
          tracker.peakElo = Math.max(tracker.peakElo, update.newElo);
          tracker.gamesPlayed += 1;
          
          if (isWin) {
            tracker.wins += 1;
          } else {
            tracker.losses += 1;
          }

          // Create history record
          historyRecords.push({
            team_id: update.teamId,
            match_id: match.id,
            old_team_elo_rating: update.oldElo,
            new_team_elo_rating: update.newElo,
            team_elo_change: update.eloChange,
            opponent_elo_rating: update.opponentElo,
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
      console.error(`💥 Error processing team match ${match.id}:`, error);
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
  async processAllMatches(matches, teams) {
    console.log('🚀 Starting Sequential Team ELO Processing...');
    console.log(`🏆 Processing ${matches.length} matches for ${teams.length} teams`);

    // Initialize team ELO tracker
    this.initializeTeamElo(teams);

    // Process matches in chronological order
    let totalHistoryRecords = 0;
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      console.log(`\n📅 Team Match ${i + 1}/${matches.length} (${new Date(match.created_at).toLocaleDateString()})`);
      
      const result = this.processMatch(match);
      if (result.success) {
        totalHistoryRecords += result.historyRecords.length;
      }
    }

    console.log('\n🏆 Sequential Team Processing Summary:');
    console.log(`   Processed Matches: ${this.processedMatches.length}`);
    console.log(`   Failed Matches: ${this.errors.length}`);
    console.log(`   Total History Records: ${totalHistoryRecords}`);

    // Show final team ELO ratings
    console.log('\n🏆 Final Team ELO Ratings:');
    for (const [teamId, tracker] of this.teamEloTracker.entries()) {
      console.log(`   ${tracker.name}: ${tracker.currentElo} (Peak: ${tracker.peakElo}, Record: ${tracker.wins}W-${tracker.losses}L)`);
    }

    return {
      success: this.errors.length === 0,
      processedMatches: this.processedMatches.length,
      totalHistoryRecords: totalHistoryRecords,
      errors: this.errors,
      finalTeamEloRatings: Array.from(this.teamEloTracker.entries()).map(([teamId, tracker]) => ({
        teamId,
        name: tracker.name,
        finalElo: tracker.currentElo,
        peakElo: tracker.peakElo,
        gamesPlayed: tracker.gamesPlayed,
        wins: tracker.wins,
        losses: tracker.losses
      }))
    };
  }

  /**
   * Save all team history records to database
   */
  async saveToDatabase() {
    console.log('💾 Saving team ELO history to database...');

    let savedRecords = 0;
    let saveErrors = 0;

    for (const processedMatch of this.processedMatches) {
      for (const record of processedMatch.historyRecords) {
        try {
          // Check if record already exists
          const { data: existing, error: checkError } = await supabase
            .from('team_elo_history')
            .select('id')
            .eq('team_id', record.team_id)
            .eq('match_id', record.match_id)
            .limit(1);

          if (checkError) {
            console.warn(`   ⚠️ Error checking existing team record:`, checkError);
            continue;
          }

          if (existing && existing.length > 0) {
            console.log(`   🔄 Team record already exists for team ${record.team_id} in match ${record.match_id}`);
            continue;
          }

          const { error: insertError } = await supabase
            .from('team_elo_history')
            .insert(record);

          if (insertError) {
            console.error(`   ❌ Failed to save team record:`, insertError);
            saveErrors++;
          } else {
            savedRecords++;
          }
        } catch (error) {
          console.error(`   💥 Error saving team record:`, error);
          saveErrors++;
        }
      }
    }

    console.log(`✅ Saved ${savedRecords} team ELO history records, ${saveErrors} errors`);

    return {
      success: saveErrors === 0,
      savedRecords,
      saveErrors
    };
  }

  /**
   * Update team final ELO ratings in database
   */
  async updateTeamEloRatings() {
    console.log('🔄 Updating team final ELO ratings...');

    let updatedTeams = 0;
    let updateErrors = 0;

    for (const [teamId, tracker] of this.teamEloTracker.entries()) {
      try {
        const { error: updateError } = await supabase
          .from('teams')
          .update({
            team_elo_rating: tracker.currentElo,
            peak_team_elo_rating: tracker.peakElo,
            team_elo_games_played: tracker.gamesPlayed,
            updated_at: new Date().toISOString()
          })
          .eq('id', teamId);

        if (updateError) {
          console.error(`   ❌ Failed to update team ${tracker.name}:`, updateError);
          updateErrors++;
        } else {
          console.log(`   ✅ Updated team ${tracker.name}: ELO=${tracker.currentElo}, Peak=${tracker.peakElo}, Games=${tracker.gamesPlayed}`);
          updatedTeams++;
        }
      } catch (error) {
        console.error(`   💥 Error updating team ${tracker.name}:`, error);
        updateErrors++;
      }
    }

    console.log(`✅ Updated ${updatedTeams} teams, ${updateErrors} errors`);

    return {
      success: updateErrors === 0,
      updatedTeams,
      updateErrors
    };
  }
}

/**
 * Complete sequential team ELO processing - main function to call
 */
export const processSequentialTeamElo = async () => {
  try {
    console.log('🏆 STARTING SEQUENTIAL TEAM ELO PROCESSING');

    // Ensure team_elo_history table exists
    const { error: tableError } = await supabase
      .from('team_elo_history')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('📋 Creating team_elo_history table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS team_elo_history (
            id SERIAL PRIMARY KEY,
            team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
            match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
            old_team_elo_rating INTEGER NOT NULL,
            new_team_elo_rating INTEGER NOT NULL,
            team_elo_change INTEGER NOT NULL,
            opponent_elo_rating INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(team_id, match_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_team_elo_history_team_id 
          ON team_elo_history(team_id);
          
          CREATE INDEX IF NOT EXISTS idx_team_elo_history_match_id 
          ON team_elo_history(match_id);
        `
      });

      if (createError) {
        throw new Error(`Failed to create team_elo_history table: ${createError.message}`);
      }
    }

    // Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, team_elo_rating');

    if (teamsError) throw teamsError;

    // Get all completed matches chronologically
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('status', 'completed')
      .not('team1_score', 'is', null)
      .not('team2_score', 'is', null)
      .not('winner_team_id', 'is', null)
      .order('created_at', { ascending: true });

    if (matchesError) throw matchesError;

    console.log(`🏆 Found ${teams.length} teams and ${matches.length} matches`);

    // Create processor and run
    const processor = new SequentialTeamEloProcessor();
    
    // Process all matches
    const processResult = await processor.processAllMatches(matches, teams);
    
    if (!processResult.success) {
      console.error('❌ Team processing failed:', processResult.errors);
      return processResult;
    }

    // Save to database
    const saveResult = await processor.saveToDatabase();
    const updateResult = await processor.updateTeamEloRatings();

    console.log('🎉 SEQUENTIAL TEAM ELO PROCESSING COMPLETE!');

    return {
      success: processResult.success && saveResult.success && updateResult.success,
      processedMatches: processResult.processedMatches,
      savedRecords: saveResult.savedRecords,
      updatedTeams: updateResult.updatedTeams,
      finalTeamEloRatings: processResult.finalTeamEloRatings,
      errors: processResult.errors
    };

  } catch (error) {
    console.error('💥 Sequential team ELO processing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Make available in browser console
if (typeof window !== 'undefined') {
  window.processSequentialTeamElo = processSequentialTeamElo;
  window.SequentialTeamEloProcessor = SequentialTeamEloProcessor;
}

export default { SequentialTeamEloProcessor, processSequentialTeamElo };