import { supabase } from '../services/supabaseService';
import { teamEloSystem } from '../utils/TeamEloSystem';

/**
 * Populate team ELO history from existing completed matches
 * This will create historical ELO progression for all teams
 */
export const populateTeamEloHistory = async () => {
  try {
    console.log('🚀 Starting Team ELO History Population...');
    
    // Step 1: Get all completed matches in chronological order
    console.log('📅 Step 1: Fetching completed matches...');
    
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        id,
        team1_id,
        team2_id,
        team1_score,
        team2_score,
        winner_team_id,
        created_at,
        status,
        team1:teams!matches_team1_id_fkey (
          id,
          name,
          team_elo_rating,
          matches_played,
          team_players (
            players (
              id,
              name,
              elo_rating,
              skill_level
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
              elo_rating,
              skill_level
            )
          )
        )
      `)
      .eq('status', 'completed')
      .not('team1_score', 'is', null)
      .not('team2_score', 'is', null)
      .order('created_at', { ascending: true });

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    console.log(`✅ Found ${matches.length} completed matches to process`);

    if (matches.length === 0) {
      console.log('ℹ️ No completed matches found. Nothing to populate.');
      return { success: true, processedMatches: 0 };
    }

    // Step 2: Initialize team ELO ratings tracking
    console.log('🎯 Step 2: Initializing team ELO tracking...');
    
    const teamEloTracker = new Map();
    const uniqueTeamIds = new Set();
    
    // Collect all unique team IDs
    matches.forEach(match => {
      uniqueTeamIds.add(match.team1_id);
      uniqueTeamIds.add(match.team2_id);
    });

    // Get current team data and initialize ELO tracking
    const { data: currentTeams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_elo_rating,
        peak_team_elo_rating,
        team_elo_games_played,
        team_players (
          players (
            id,
            name,
            elo_rating,
            skill_level
          )
        )
      `)
      .in('id', Array.from(uniqueTeamIds));

    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError);
      throw teamsError;
    }

    // Initialize each team's ELO tracking
    currentTeams.forEach(team => {
      let initialElo = 1500;
      
      // Calculate initial ELO from player averages if team doesn't have ELO yet
      if (!team.team_elo_rating || team.team_elo_rating === 1500) {
        if (team.team_players && team.team_players.length > 0) {
          const playerElos = team.team_players
            .map(tp => {
              const player = tp.players;
              if (!player || !player.elo_rating) return 1500;
              
              // Use initial ELO based on skill level for historical calculation
              const skillLevel = player.skill_level?.toLowerCase();
              if (skillLevel === 'advanced') return 1800;
              if (skillLevel === 'beginner') return 1200;
              return 1500; // intermediate or default
            })
            .filter(elo => elo > 0);

          if (playerElos.length > 0) {
            initialElo = Math.round(playerElos.reduce((sum, elo) => sum + elo, 0) / playerElos.length);
          }
        }
      } else {
        initialElo = team.team_elo_rating;
      }
      
      teamEloTracker.set(team.id, {
        currentElo: initialElo,
        initialElo: initialElo,
        gamesPlayed: 0,
        peakElo: initialElo,
        name: team.name
      });
      
      console.log(`🎯 Team ${team.name}: Starting ELO = ${initialElo}`);
    });

    // Step 3: Process each match chronologically
    console.log('⚡ Step 3: Processing matches chronologically...');
    
    const historyRecords = [];
    let processedCount = 0;

    for (const match of matches) {
      try {
        console.log(`📊 Processing match ${processedCount + 1}/${matches.length}: ${match.team1?.name} vs ${match.team2?.name}`);
        
        // Get current team ELO ratings for this point in time
        const team1Tracker = teamEloTracker.get(match.team1_id);
        const team2Tracker = teamEloTracker.get(match.team2_id);
        
        if (!team1Tracker || !team2Tracker) {
          console.warn(`⚠️ Missing team tracker for match ${match.id}`);
          continue;
        }

        // Create team data objects for ELO calculation
        const team1Data = {
          id: match.team1_id,
          name: match.team1?.name || 'Team 1',
          team_elo_rating: team1Tracker.currentElo,
          matches_played: team1Tracker.gamesPlayed,
          team_players: match.team1?.team_players || []
        };

        const team2Data = {
          id: match.team2_id,
          name: match.team2?.name || 'Team 2',
          team_elo_rating: team2Tracker.currentElo,
          matches_played: team2Tracker.gamesPlayed,
          team_players: match.team2?.team_players || []
        };

        // Calculate ELO changes using the team ELO system
        const eloUpdates = teamEloSystem.processTeamMatchResult(
          team1Data,
          team2Data,
          match.team1_score,
          match.team2_score
        );

        // Process each team's ELO update
        eloUpdates.forEach(update => {
          if (update.error) {
            console.warn(`⚠️ Skipping update for team ${update.teamName}: ${update.error}`);
            return;
          }

          const teamTracker = teamEloTracker.get(update.teamId);
          if (!teamTracker) return;

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
            reason: 'Historical team ELO calculation'
          });

          // Update tracker
          teamTracker.currentElo = update.newRating;
          teamTracker.gamesPlayed += 1;
          teamTracker.peakElo = Math.max(teamTracker.peakElo, update.newRating);
          
          console.log(`  📈 ${update.teamName}: ${update.oldRating} → ${update.newRating} (${update.ratingChange > 0 ? '+' : ''}${update.ratingChange})`);
        });

        processedCount++;
        
        // Progress indicator
        if (processedCount % 10 === 0) {
          console.log(`📊 Progress: ${processedCount}/${matches.length} matches processed`);
        }

      } catch (matchError) {
        console.error(`❌ Error processing match ${match.id}:`, matchError);
        continue;
      }
    }

    // Step 4: Insert history records in batches
    console.log('💾 Step 4: Saving team ELO history to database...');
    
    if (historyRecords.length > 0) {
      const batchSize = 50;
      let insertedCount = 0;
      
      for (let i = 0; i < historyRecords.length; i += batchSize) {
        const batch = historyRecords.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('team_elo_history')
          .insert(batch);

        if (insertError) {
          console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
          // Continue with other batches
        } else {
          insertedCount += batch.length;
          console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(historyRecords.length / batchSize)} (${insertedCount}/${historyRecords.length} records)`);
        }
      }
      
      console.log(`💾 Total team ELO history records inserted: ${insertedCount}`);
    }

    // Step 5: Update teams with final ELO ratings (ENHANCED with better error handling)
    console.log('🎯 Step 5: Updating teams with final ELO ratings...');
    
    let successfulUpdates = 0;
    let failedUpdates = 0;

    for (const [teamId, tracker] of teamEloTracker) {
      try {
        console.log(`🔄 Updating ${tracker.name} with ELO ${tracker.currentElo}...`);

        // First, verify the team exists
        const { data: existingTeam, error: fetchError } = await supabase
            .from('teams')
          .select('id, name, team_elo_rating')
          .eq('id', teamId)
          .single();

        if (fetchError) {
          console.error(`❌ Could not fetch team ${tracker.name}:`, fetchError);
          failedUpdates++;
          continue;
        }

        if (!existingTeam) {
          console.error(`❌ Team ${tracker.name} not found in database`);
          failedUpdates++;
          continue;
        }

        console.log(`📊 Current team data:`, existingTeam);

        // Update with explicit individual fields to avoid constraints
        const { data: updatedTeam, error: updateError } = await supabase
        .from('teams')
          .update({
            team_elo_rating: tracker.currentElo,
            peak_team_elo_rating: tracker.peakElo,
            team_elo_games_played: tracker.gamesPlayed,
            updated_at: new Date().toISOString()
          })
          .eq('id', teamId)
          .select('id, name, team_elo_rating, peak_team_elo_rating, team_elo_games_played');

        if (updateError) {
          console.error(`❌ Error updating team ${tracker.name}:`, updateError);

          // Try alternative update method
          console.log(`🔄 Trying alternative update for ${tracker.name}...`);

          const { error: altUpdateError } = await supabase
            .rpc('update_team_elo', {
              team_id: teamId,
              new_elo_rating: tracker.currentElo,
              new_peak_elo: tracker.peakElo,
              new_games_played: tracker.gamesPlayed
            });

          if (altUpdateError) {
            console.error(`❌ Alternative update also failed for ${tracker.name}:`, altUpdateError);
            failedUpdates++;
            continue;
          } else {
            console.log(`✅ Alternative update succeeded for ${tracker.name}`);
            successfulUpdates++;
          }
        } else {
          console.log(`✅ Successfully updated ${tracker.name}: ${tracker.currentElo} ELO (Peak: ${tracker.peakElo}, Games: ${tracker.gamesPlayed})`);
          console.log(`📊 Update result:`, updatedTeam);
          successfulUpdates++;
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (teamError) {
        console.error(`❌ Exception updating team ${tracker.name}:`, teamError);
        failedUpdates++;
      }
    }

    console.log(`📊 Team Update Summary: ${successfulUpdates} successful, ${failedUpdates} failed`);

    if (failedUpdates > 0) {
      console.warn(`⚠️ ${failedUpdates} teams failed to update. This may be due to database constraints.`);
    }

    // Final verification with detailed logging
    console.log('🔍 Step 6: Final verification of team ELO updates...');

    const { data: finalTeams, error: verifyError } = await supabase
      .from('teams')
      .select('id, name, team_elo_rating, peak_team_elo_rating, team_elo_games_played')
        .in('id', Array.from(teamEloTracker.keys()));

    if (!verifyError && finalTeams) {
      console.log('📊 Final Team ELO Verification Results:');

      let verifiedUpdates = 0;
      let stillDefault = 0;
      finalTeams.forEach(team => {
        const tracker = teamEloTracker.get(team.id);
        if (tracker) {
          if (team.team_elo_rating === tracker.currentElo) {
            console.log(`   ✅ ${team.name}: ${team.team_elo_rating} ELO (Peak: ${team.peak_team_elo_rating}, Games: ${team.team_elo_games_played}) - VERIFIED`);
            verifiedUpdates++;
          } else if (team.team_elo_rating === 1500 || team.team_elo_rating === null) {
            console.log(`   ❌ ${team.name}: Still at default (${team.team_elo_rating}) - Expected: ${tracker.currentElo}`);
            stillDefault++;
          } else {
            console.log(`   ⚠️ ${team.name}: ${team.team_elo_rating} ELO - Expected: ${tracker.currentElo} - MISMATCH`);
      }
    }
      });

      console.log(`🎯 Verification Summary: ${verifiedUpdates} verified, ${stillDefault} still at default`);

      if (stillDefault > 0) {
        console.error(`❌ ${stillDefault} teams still show default ELO ratings!`);
        console.log('🔧 Attempting manual fix for remaining teams...');

        // Try to fix the remaining teams
        for (const team of finalTeams) {
          if ((team.team_elo_rating === 1500 || team.team_elo_rating === null) && teamEloTracker.has(team.id)) {
            const tracker = teamEloTracker.get(team.id);
            console.log(`🔧 Manual fix attempt for ${team.name}...`);
  try {
              const { error: manualError } = await supabase
                .from('teams')
                .update({ team_elo_rating: tracker.currentElo })
                .eq('id', team.id);

              if (manualError) {
                console.error(`❌ Manual fix failed for ${team.name}:`, manualError);
              } else {
                console.log(`✅ Manual fix succeeded for ${team.name}`);
              }
            } catch (fixError) {
              console.error(`❌ Manual fix exception for ${team.name}:`, fixError);
            }
          }
        }
      }
    } else if (verifyError) {
      console.warn('⚠️ Could not verify team updates:', verifyError);
    }

    // Summary
    console.log('🎉 Team ELO History Population Complete!');
    console.log('📊 Summary:');
    console.log(`   • Processed: ${processedCount} matches`);
    console.log(`   • Created: ${historyRecords.length} ELO history records`);
    console.log(`   • Updated: ${successfulUpdates} teams successfully, ${failedUpdates} failed`);
    console.log('');
    console.log('📈 Team ELO charts will now show actual historical progression!');
    return {
      success: true,
      processedMatches: processedCount,
      historyRecords: historyRecords.length,
      updatedTeams: successfulUpdates,
      failedUpdates: failedUpdates
    };

  } catch (error) {
    console.error('💥 Team ELO History Population failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Clear existing team ELO history (for re-population)
 */
export const clearTeamEloHistory = async () => {
  try {
    console.log('🗑️ Clearing existing team ELO history...');
    
    const { error } = await supabase
      .from('team_elo_history')
      .delete()
      .neq('id', 0); // Delete all records
    
    if (error) {
      console.error('❌ Error clearing team ELO history:', error);
      throw error;
    }
    
    console.log('✅ Team ELO history cleared successfully');
    return true;
  } catch (error) {
    console.error('💥 Error clearing team ELO history:', error);
    return false;
  }
};

/**
 * Full re-population (clear + populate)
 */
export const repopulateTeamEloHistory = async () => {
  try {
    console.log('🔄 Starting full team ELO history re-population...');
    
    // Clear existing history
    const clearSuccess = await clearTeamEloHistory();
    if (!clearSuccess) {
      throw new Error('Failed to clear existing history');
    }
    
    // Populate new history
    const result = await populateTeamEloHistory();
    
    if (result.success) {
      console.log('🎉 Full re-population completed successfully!');
    }
    
    return result;
  } catch (error) {
    console.error('💥 Full re-population failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export for browser console usage
if (typeof window !== 'undefined') {
  window.populateTeamEloHistory = populateTeamEloHistory;
  window.clearTeamEloHistory = clearTeamEloHistory;
  window.repopulateTeamEloHistory = repopulateTeamEloHistory;
}