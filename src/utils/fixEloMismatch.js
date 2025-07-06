import { supabase } from '../services/supabaseService';

/**
 * Fix ELO mismatch between charts and player list
 * This script will sync player ELO ratings with their latest ELO history
 */
export const fixEloMismatch = async () => {
  try {
    console.log('🔧 Starting ELO Mismatch Fix...');

    // Step 1: Get all players with their current ELO
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, elo_rating');

    if (playersError) {
      console.error('❌ Error fetching players:', playersError);
      return { success: false, error: playersError.message };
    }

    console.log(`👥 Found ${players.length} players to check`);

    let syncedPlayers = 0;
    let errors = 0;
    const syncDetails = [];

    // Step 2: For each player, get their latest ELO from history and sync
    for (const player of players) {
      try {
        // Get the latest ELO rating from history
        const { data: latestEloHistory, error: historyError } = await supabase
          .from('player_rating_history')
          .select('new_rating, created_at, match_id')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (historyError) {
          console.warn(`   ⚠️ Error fetching ELO history for ${player.name}:`, historyError);
          continue;
        }

        if (latestEloHistory && latestEloHistory.length > 0) {
          const historyElo = latestEloHistory[0].new_rating;
          const currentElo = player.elo_rating;

          console.log(`🔍 ${player.name}: Current=${currentElo}, History=${historyElo}`);

          if (historyElo !== currentElo) {
            console.log(`   🔄 MISMATCH FOUND - Syncing: ${currentElo} → ${historyElo}`);

            // Update the player's ELO to match history
            const { error: updateError } = await supabase
              .from('players')
              .update({ 
                elo_rating: historyElo,
                updated_at: new Date().toISOString()
              })
              .eq('id', player.id);

            if (updateError) {
              console.error(`   ❌ Failed to sync ${player.name}:`, updateError);
              errors++;
            } else {
              console.log(`   ✅ Successfully synced ${player.name}`);
              syncedPlayers++;
              syncDetails.push({
                name: player.name,
                oldElo: currentElo,
                newElo: historyElo,
                difference: historyElo - currentElo
              });
            }
          } else {
            console.log(`   ✅ ${player.name} ELO already matches`);
          }
        } else {
          console.log(`   ℹ️ ${player.name} has no ELO history yet`);
        }
      } catch (playerError) {
        console.error(`   💥 Error processing ${player.name}:`, playerError);
        errors++;
      }
    }

    console.log('\n📊 ELO MISMATCH FIX SUMMARY:');
    console.log(`   Total Players Checked: ${players.length}`);
    console.log(`   Players Synced: ${syncedPlayers}`);
    console.log(`   Errors: ${errors}`);

    if (syncDetails.length > 0) {
      console.log('\n🔄 SYNCED PLAYERS:');
      syncDetails.forEach(detail => {
        const change = detail.difference > 0 ? `+${detail.difference}` : `${detail.difference}`;
        console.log(`   ${detail.name}: ${detail.oldElo} → ${detail.newElo} (${change})`);
      });
    }

    return {
      success: errors === 0,
      totalPlayers: players.length,
      syncedPlayers,
      errors,
      syncDetails
    };

  } catch (error) {
    console.error('💥 ELO mismatch fix failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Clear duplicate ELO history records
 * Keeps the most recent record for each player-match combination
 */
export const clearDuplicateEloHistory = async () => {
  try {
    console.log('🧹 Clearing duplicate ELO history records...');

    // Get all duplicate records (same player_id and match_id)
    const { data: duplicates, error: duplicatesError } = await supabase
      .rpc('find_duplicate_elo_history');

    if (duplicatesError) {
      console.log('ℹ️ Could not find duplicates with RPC, using manual method...');
      
      // Manual approach - find and delete older duplicates
      const { data: allRecords, error: allError } = await supabase
        .from('player_rating_history')
        .select('id, player_id, match_id, created_at')
        .order('player_id, match_id, created_at', { ascending: false });

      if (allError) {
        throw allError;
      }

      const seen = new Set();
      const toDelete = [];

      allRecords.forEach(record => {
        const key = `${record.player_id}-${record.match_id}`;
        if (seen.has(key)) {
          // This is a duplicate - mark for deletion
          toDelete.push(record.id);
        } else {
          seen.add(key);
        }
      });

      if (toDelete.length > 0) {
        console.log(`🗑️ Deleting ${toDelete.length} duplicate records...`);
        
        const { error: deleteError } = await supabase
          .from('player_rating_history')
          .delete()
          .in('id', toDelete);

        if (deleteError) {
          throw deleteError;
        }

        console.log(`✅ Deleted ${toDelete.length} duplicate ELO history records`);
        return { success: true, deletedRecords: toDelete.length };
      } else {
        console.log('ℹ️ No duplicate records found');
        return { success: true, deletedRecords: 0 };
      }
    }

    return { success: true, deletedRecords: 0 };

  } catch (error) {
    console.error('💥 Clear duplicates failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Complete ELO system fix - clears duplicates and syncs ELO
 */
export const completeEloFix = async () => {
  console.log('🚀 Starting Complete ELO System Fix...');
  
  // Step 1: Clear duplicates
  const duplicateResult = await clearDuplicateEloHistory();
  if (!duplicateResult.success) {
    console.error('❌ Failed to clear duplicates:', duplicateResult.error);
    return duplicateResult;
  }

  // Step 2: Fix ELO mismatches
  const syncResult = await fixEloMismatch();
  if (!syncResult.success) {
    console.error('❌ Failed to sync ELO:', syncResult.error);
    return syncResult;
  }

  console.log('🎉 Complete ELO fix successful!');
  return {
    success: true,
    duplicatesCleared: duplicateResult.deletedRecords,
    playersSync: syncResult.syncedPlayers,
    totalPlayers: syncResult.totalPlayers
  };
};

// Make available in browser console
if (typeof window !== 'undefined') {
  window.fixEloMismatch = fixEloMismatch;
  window.clearDuplicateEloHistory = clearDuplicateEloHistory;
  window.completeEloFix = completeEloFix;
}

export default { fixEloMismatch, clearDuplicateEloHistory, completeEloFix };