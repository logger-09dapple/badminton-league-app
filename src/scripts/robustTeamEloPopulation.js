import { supabase } from '../services/supabaseService';
import { teamEloSystem } from '../utils/TeamEloSystem';

/**
 * Robust team ELO population that handles database constraints and update issues
 */
export const robustTeamEloPopulation = async () => {
  try {
    console.log('🚀 Starting Robust Team ELO Population...');
    
    // Step 1: Check database constraints and schema
    console.log('🔍 Step 1: Checking database schema...');
    
    const { data: schemaCheck, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, is_nullable, column_default')
      .eq('table_name', 'teams')
      .in('column_name', ['name', 'team_elo_rating', 'peak_team_elo_rating', 'team_elo_games_played']);
    
    if (!schemaError && schemaCheck) {
      console.log('📊 Teams table schema:');
      schemaCheck.forEach(col => {
        console.log(`   ${col.column_name}: nullable=${col.is_nullable}, default=${col.column_default}`);
      });
    }

    // Step 2: Get completed matches
    console.log('📅 Step 2: Fetching completed matches...');
    
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id, team1_id, team2_id, team1_score, team2_score, 
        winner_team_id, created_at, status
      `)
      .eq('status', 'completed')
      .not('team1_score', 'is', null)
      .not('team2_score', 'is', null)
      .order('created_at', { ascending: true });

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    console.log(`✅ Found ${matches.length} completed matches`);

    if (matches.length === 0) {
      console.log('ℹ️ No completed matches found.');
      return { success: true, processedMatches: 0, message: 'No matches to process' };
    }

    // Step 3: Get teams with detailed info
    console.log('🎯 Step 3: Fetching teams with constraints check...');
    
    const uniqueTeamIds = [...new Set([
      ...matches.map(m => m.team1_id),
      ...matches.map(m => m.team2_id)
    ])];

    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id, name, team_elo_rating, peak_team_elo_rating, team_elo_games_played,
        created_at, updated_at,
        team_players(
          players(id, name, elo_rating, skill_level)
        )
      `)
      .in('id', uniqueTeamIds);

    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError);
      throw teamsError;
    }

    console.log(`✅ Found ${teams.length} teams`);

    // Step 4: Initialize tracking with better error handling
    console.log('⚡ Step 4: Initializing team ELO tracking...');
    
    const teamEloTracker = new Map();
    const teamUpdates = [];

    teams.forEach(team => {
      let initialElo = 1500;
      
      // Calculate initial ELO from players
      if (team.team_players && team.team_players.length > 0) {
        const playerElos = team.team_players.map(tp => {
          const player = tp.players;
          if (!player) return 1500;
          
          const skill = player.skill_level?.toLowerCase();
          if (skill === 'advanced') return 1800;
          if (skill === 'beginner') return 1200;
          return 1500;
        });
        
        if (playerElos.length > 0) {
          initialElo = Math.round(playerElos.reduce((sum, elo) => sum + elo, 0) / playerElos.length);
        }
      }
      
      teamEloTracker.set(team.id, {
        id: team.id,
        name: team.name,
        currentElo: initialElo,
        peakElo: initialElo,
        gamesPlayed: 0,
        originalData: team
      });
      
      console.log(`🎯 ${team.name}: Starting ELO = ${initialElo}`);
    });

    // Step 5: Process matches
    console.log('📊 Step 5: Processing matches chronologically...');
    
    const historyRecords = [];
    let processedCount = 0;

    for (const match of matches) {
      try {
        const team1Data = teamEloTracker.get(match.team1_id);
        const team2Data = teamEloTracker.get(match.team2_id);
        
        if (!team1Data || !team2Data) {
          console.warn(`⚠️ Missing team data for match ${match.id}`);
          continue;
        }

        // Create team objects for ELO calculation
        const team1Obj = {
          id: match.team1_id,
          name: team1Data.name,
          team_elo_rating: team1Data.currentElo,
          matches_played: team1Data.gamesPlayed,
          team_players: team1Data.originalData.team_players || []
        };

        const team2Obj = {
          id: match.team2_id,
          name: team2Data.name,
          team_elo_rating: team2Data.currentElo,
          matches_played: team2Data.gamesPlayed,
          team_players: team2Data.originalData.team_players || []
        };

        // Calculate ELO updates
        const eloUpdates = teamEloSystem.processTeamMatchResult(
          team1Obj,
          team2Obj,
          match.team1_score,
          match.team2_score
        );

        // Process updates
        eloUpdates.forEach(update => {
          if (update.error) {
            console.warn(`⚠️ ELO calculation error: ${update.error}`);
            return;
          }

          const teamData = teamEloTracker.get(update.teamId);
          if (!teamData) return;

          // Create history record
          historyRecords.push({
            team_id: update.teamId,
            match_id: match.id,
            old_team_elo_rating: update.oldRating,
            new_team_elo_rating: update.newRating,
            team_elo_change: update.ratingChange,
            opponent_team_id: update.teamId === match.team1_id ? match.team2_id : match.team1_id,
            opponent_team_elo_rating: update.opponentRating,
            match_outcome: update.won ? 'win' : 'loss',
            expected_score: update.expectedScore,
            actual_score: update.actualScore,
            k_factor: update.kFactor,
            created_at: match.created_at,
            reason: 'Robust team ELO population'
          });

          // Update tracker
          teamData.currentElo = update.newRating;
          teamData.gamesPlayed += 1;
          teamData.peakElo = Math.max(teamData.peakElo, update.newRating);
        });

        processedCount++;
        
        if (processedCount % 10 === 0) {
          console.log(`📊 Processed ${processedCount}/${matches.length} matches`);
        }

      } catch (matchError) {
        console.error(`❌ Error processing match ${match.id}:`, matchError);
        continue;
      }
    }

    // Step 6: Save history records
    console.log('💾 Step 6: Saving team ELO history...');
    
    if (historyRecords.length > 0) {
      const batchSize = 25;
      let insertedCount = 0;
      
      for (let i = 0; i < historyRecords.length; i += batchSize) {
        const batch = historyRecords.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('team_elo_history')
          .insert(batch);

        if (insertError) {
          console.error(`❌ Error inserting history batch:`, insertError);
        } else {
          insertedCount += batch.length;
          console.log(`✅ Inserted ${insertedCount}/${historyRecords.length} history records`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Step 7: Robust team updates with multiple strategies
    console.log('🎯 Step 7: Robust team ELO updates...');
    
    let strategy1Success = 0;
    let strategy2Success = 0;
    let strategy3Success = 0;
    let totalFailures = 0;

    for (const [teamId, teamData] of teamEloTracker) {
      let updateSuccess = false;
      
      // Strategy 1: Direct update
      try {
        const { error: directError } = await supabase
          .from('teams')
          .update({
            team_elo_rating: teamData.currentElo,
            peak_team_elo_rating: teamData.peakElo,
            team_elo_games_played: teamData.gamesPlayed,
            updated_at: new Date().toISOString()
          })
          .eq('id', teamId);

        if (!directError) {
          console.log(`✅ Direct update: ${teamData.name} = ${teamData.currentElo} ELO`);
          strategy1Success++;
          updateSuccess = true;
        } else {
          console.warn(`⚠️ Direct update failed for ${teamData.name}:`, directError);
        }
      } catch (directException) {
        console.warn(`⚠️ Direct update exception for ${teamData.name}:`, directException);
      }

      // Strategy 2: Individual field updates
      if (!updateSuccess) {
        try {
          await supabase.from('teams').update({ team_elo_rating: teamData.currentElo }).eq('id', teamId);
          await supabase.from('teams').update({ peak_team_elo_rating: teamData.peakElo }).eq('id', teamId);
          await supabase.from('teams').update({ team_elo_games_played: teamData.gamesPlayed }).eq('id', teamId);
          
          console.log(`✅ Individual updates: ${teamData.name} = ${teamData.currentElo} ELO`);
          strategy2Success++;
          updateSuccess = true;
        } catch (individualError) {
          console.warn(`⚠️ Individual updates failed for ${teamData.name}:`, individualError);
        }
      }

      // Strategy 3: SQL function (if available)
      if (!updateSuccess) {
        try {
          const { error: rpcError } = await supabase.rpc('update_team_elo', {
            team_id: teamId,
            new_elo_rating: teamData.currentElo,
            new_peak_elo: teamData.peakElo,
            new_games_played: teamData.gamesPlayed
          });

          if (!rpcError) {
            console.log(`✅ RPC update: ${teamData.name} = ${teamData.currentElo} ELO`);
            strategy3Success++;
            updateSuccess = true;
          } else {
            console.warn(`⚠️ RPC update failed for ${teamData.name}:`, rpcError);
          }
        } catch (rpcException) {
          console.warn(`⚠️ RPC update exception for ${teamData.name}:`, rpcException);
        }
      }

      if (!updateSuccess) {
        console.error(`❌ All update strategies failed for ${teamData.name}`);
        totalFailures++;
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Step 8: Comprehensive verification
    console.log('🔍 Step 8: Comprehensive verification...');
    
    const { data: verificationTeams, error: verifyError } = await supabase
      .from('teams')
      .select('id, name, team_elo_rating, peak_team_elo_rating, team_elo_games_played')
      .in('id', Array.from(teamEloTracker.keys()));

    let actuallyUpdated = 0;
    let stillDefault = 0;

    if (!verifyError && verificationTeams) {
      console.log('📊 Final Verification Results:');
      
      verificationTeams.forEach(team => {
        const expected = teamEloTracker.get(team.id);
        if (expected) {
          if (team.team_elo_rating === expected.currentElo) {
            console.log(`   ✅ ${team.name}: ${team.team_elo_rating} ELO ✓`);
            actuallyUpdated++;
          } else if (team.team_elo_rating === 1500 || team.team_elo_rating === null) {
            console.log(`   ❌ ${team.name}: Still default (${team.team_elo_rating}) - Expected: ${expected.currentElo}`);
            stillDefault++;
          } else {
            console.log(`   ⚠️ ${team.name}: ${team.team_elo_rating} ELO - Expected: ${expected.currentElo}`);
          }
        }
      });
    }

    // Final summary
    console.log('🎉 Robust Team ELO Population Complete!');
    console.log('📊 Final Summary:');
    console.log(`   • Processed matches: ${processedCount}`);
    console.log(`   • History records: ${historyRecords.length}`);
    console.log(`   • Update strategies used:`);
    console.log(`     - Direct updates: ${strategy1Success}`);
    console.log(`     - Individual updates: ${strategy2Success}`);
    console.log(`     - RPC updates: ${strategy3Success}`);
    console.log(`     - Failed updates: ${totalFailures}`);
    console.log(`   • Verification results:`);
    console.log(`     - Successfully updated: ${actuallyUpdated}`);
    console.log(`     - Still at default: ${stillDefault}`);

    if (stillDefault > 0) {
      console.warn(`⚠️ ${stillDefault} teams still show default ELO. This may be due to database constraints.`);
      console.log('💡 Suggestion: Check your database schema and constraints on the teams table.');
    }

    return {
      success: totalFailures === 0 && stillDefault === 0,
      processedMatches: processedCount,
      historyRecords: historyRecords.length,
      updatedTeams: actuallyUpdated,
      failedTeams: stillDefault,
      strategies: {
        direct: strategy1Success,
        individual: strategy2Success,
        rpc: strategy3Success,
        failed: totalFailures
      }
    };

  } catch (error) {
    console.error('💥 Robust team ELO population failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Make available for console use
if (typeof window !== 'undefined') {
  window.robustTeamEloPopulation = robustTeamEloPopulation;
}