import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import { Database, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Users, Settings, Trophy } from 'lucide-react';

const PlayerStatsPopulator = () => {
  const [status, setStatus] = useState('idle'); // idle, running, success, error
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState(null);
  const [operation, setOperation] = useState('');

  // Schema validation helper
  const validateDatabaseSchema = async () => {
    try {
      console.log('🔍 Validating database schema...');

      // Check players table columns
      const { data: playersTest, error: playersError } = await supabase
        .from('players')
        .select('id, matches_played, matches_won, points, total_points_scored, total_points_conceded, win_percentage')
        .limit(1);

      if (playersError) {
        console.error('Players table schema issue:', playersError);
        return {
          success: false,
          error: `Players table schema issue: ${playersError.message}`,
          suggestion: "Run the SQL migration script: src/sql/fix_player_schema.sql"
        };
      }

      // Check player_rating_history table
      const { data: historyTest, error: historyError } = await supabase
        .from('player_rating_history')
        .select('id, player_id, match_id, old_rating, new_rating, rating_change')
        .limit(1);
      if (historyError && historyError.code !== '42P01') {
        console.error('Player rating history table schema issue:', historyError);
        return {
          success: false,
          error: `Player rating history table schema issue: ${historyError.message}`,
          suggestion: "Run the SQL migration script: src/sql/fix_player_schema.sql"
        };
      }

      console.log('✅ Database schema validation passed');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Schema validation failed: ${error.message}`,
        suggestion: "Check database connection and run the SQL migration script"
      };
    }
  };

  // Populate player statistics from match history
  const populatePlayerStats = async () => {
    try {
      console.log('🚀 Starting Player Stats Population...');

      // Step 1: Get all players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*');

      if (playersError) throw playersError;

      // Step 2: Get all completed matches chronologically with full team and player data
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(
            id, name,
            team_players(player_id, players(id, name, elo_rating, skill_level, elo_games_played))
          ),
          team2:teams!matches_team2_id_fkey(
            id, name,
            team_players(player_id, players(id, name, elo_rating, skill_level, elo_games_played))
          )
        `)
        .eq('status', 'completed')
        .not('team1_score', 'is', null)
        .not('team2_score', 'is', null)
        .not('winner_team_id', 'is', null)
        .order('created_at', { ascending: true });

      if (matchesError) throw matchesError;

      console.log(`📊 Processing ${matches.length} completed matches for player ELO history`);

      // Step 3: Process each match and calculate ELO changes using the same system as live matches
      let historyRecords = 0;
      let skippedMatches = 0;
      const { badmintonEloSystem } = await import('../utils/BadmintonEloSystem');

      for (const match of matches) {
        try {
          // Get all players in this match with their current data
          const team1Players = match.team1?.team_players?.map(tp => tp.players).filter(Boolean) || [];
          const team2Players = match.team2?.team_players?.map(tp => tp.players).filter(Boolean) || [];

          if (team1Players.length === 0 || team2Players.length === 0) {
            console.warn(`⚠️ Skipping match ${match.id}: Missing player data`);
            skippedMatches++;
            continue;
          }

          console.log(`🎯 Processing match: ${match.team1?.name} vs ${match.team2?.name} (${match.team1_score}-${match.team2_score})`);

          // Use the same ELO calculation system as live matches
          const eloUpdates = badmintonEloSystem.processMatchResult(
            team1Players,
            team2Players,
            match.team1_score || 0,
            match.team2_score || 0
          );

          if (!eloUpdates || !eloUpdates.playerEloUpdates) {
            console.warn(`⚠️ No ELO updates generated for match ${match.id}`);
            skippedMatches++;
            continue;
          }

          console.log(`   Generated ${eloUpdates.playerEloUpdates.length} player ELO updates`);

          // Insert ELO history records with duplicate handling
          for (const update of eloUpdates.playerEloUpdates) {
            try {
              // Verify the update has required data
              if (!update.playerId || !update.oldRating || !update.newRating) {
                console.warn(`   ⚠️ Skipping invalid ELO update:`, update);
                continue;
              }

              const { error: insertError } = await supabase
                .from('player_rating_history')
                .insert({
                  player_id: update.playerId,
                  match_id: match.id,
                  old_rating: Math.round(update.oldRating),
                  new_rating: Math.round(update.newRating),
                  rating_change: Math.round(update.ratingChange),
                  opponent_avg_rating: Math.round(update.opponentAvgRating || 1500),
                  old_skill_level: update.oldSkillLevel,
                  new_skill_level: update.newSkillLevel,
                  created_at: match.created_at
                });

              if (!insertError) {
                historyRecords++;
                console.log(`   ✅ ELO: ${update.oldRating} → ${update.newRating} (${update.ratingChange > 0 ? '+' : ''}${update.ratingChange}) for player ${update.playerName}`);
              } else if (insertError.code === '23505') {
                // Duplicate - skip silently
                console.log(`   🔄 Duplicate ELO record for player ${update.playerName} in match ${match.id}`);
              } else {
                console.error(`   ❌ Failed to insert ELO history for player ${update.playerId}:`, insertError);
              }
            } catch (insertError) {
              console.error(`   💥 Error inserting ELO history for player ${update.playerId}:`, insertError);
            }
          }
        } catch (matchError) {
          console.error(`💥 Failed to process match ${match.id}:`, matchError);
          skippedMatches++;
        }
      }

      console.log(`\n📈 ELO History Population Summary:`);
      console.log(`   Processed Matches: ${matches.length}`);
      console.log(`   Skipped Matches: ${skippedMatches}`);
      console.log(`   Created History Records: ${historyRecords}`);

      // Step 3: Calculate stats for each player
      const playerUpdates = [];

      for (const player of players) {
        let matchesPlayed = 0;
        let matchesWon = 0;
        let points = 0;
        let totalPointsScored = 0;
        let totalPointsConceded = 0;

        // Find matches where this player participated
        for (const match of matches) {
          const isInTeam1 = match.team1?.team_players?.some(tp => tp.player_id === player.id);
          const isInTeam2 = match.team2?.team_players?.some(tp => tp.player_id === player.id);

          if (isInTeam1 || isInTeam2) {
            matchesPlayed++;

            // Determine if player won
            const playerTeamId = isInTeam1 ? match.team1_id : match.team2_id;
            if (match.winner_team_id === playerTeamId) {
              matchesWon++;
              points += 3; // Win points
            } else {
              points += 1; // Participation points
            }

            // Add points scored/conceded
            if (isInTeam1) {
              totalPointsScored += match.team1_score || 0;
              totalPointsConceded += match.team2_score || 0;
            } else {
              totalPointsScored += match.team2_score || 0;
              totalPointsConceded += match.team1_score || 0;
            }
          }
        }

        // Only update if there are changes or if this is a new player with no stats
        if (matchesPlayed > 0 ||
            player.matches_played !== matchesPlayed ||
            player.matches_played === null ||
            player.matches_played === undefined) {
          const updateObj = {
            id: player.id,
            matches_played: matchesPlayed,
            matches_won: matchesWon,
            points: points,
            win_percentage: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0
          };

          // Only include optional columns if we have data for them
          if (totalPointsScored > 0 || totalPointsConceded > 0) {
            updateObj.total_points_scored = totalPointsScored;
            updateObj.total_points_conceded = totalPointsConceded;
          }

          playerUpdates.push(updateObj);
        }
      }

      console.log(`📈 Calculated stats for ${playerUpdates.length} players`);

      // Step 4: Update players in batches - FIXED: Handle missing columns gracefully
      let successfulUpdates = 0;
      let failedUpdates = 0;

      for (const update of playerUpdates) {
        try {
          // Build update object with only the columns that should exist
      const updateData = {
            matches_played: update.matches_played,
            matches_won: update.matches_won,
            points: update.points,
            win_percentage: update.win_percentage
      };

          // Only add optional columns if they have values
          if (update.total_points_scored !== undefined) {
            updateData.total_points_scored = update.total_points_scored;
        }
          if (update.total_points_conceded !== undefined) {
            updateData.total_points_conceded = update.total_points_conceded;
        }
          const { error: updateError } = await supabase
        .from('players')
        .update(updateData)
            .eq('id', update.id);

          if (updateError) {
            console.error(`❌ Failed to update player ${update.id}:`, updateError);
            failedUpdates++;
          } else {
            successfulUpdates++;
      }
    } catch (error) {
          console.error(`❌ Error updating player ${update.id}:`, error);
          failedUpdates++;
        }
      }
      return {
        success: failedUpdates === 0,
        processedPlayers: players.length,
        processedMatches: matches.length,
        updatedPlayers: successfulUpdates,
        failedUpdates: failedUpdates,
        playersWithStats: playerUpdates.length
      };

    } catch (error) {
      console.error('💥 Player stats population failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Populate player ELO history from matches
  const populatePlayerEloHistory = async () => {
    try {
      console.log('🚀 Starting Player ELO History Population...');

      // Step 1: Check if player_rating_history table exists
      const { data: tableCheck, error: tableError } = await supabase
        .from('player_rating_history')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === '42P01') {
        // Table doesn't exist, create it
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS player_rating_history (
              id SERIAL PRIMARY KEY,
              player_id UUID REFERENCES players(id) ON DELETE CASCADE,
              match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
              old_rating INTEGER NOT NULL,
              new_rating INTEGER NOT NULL,
              rating_change INTEGER NOT NULL,
              opponent_avg_rating INTEGER,
              old_skill_level VARCHAR(20),
              new_skill_level VARCHAR(20),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(player_id, match_id)
  );

            CREATE INDEX IF NOT EXISTS idx_player_rating_history_player_id
            ON player_rating_history(player_id);

            CREATE INDEX IF NOT EXISTS idx_player_rating_history_match_id
            ON player_rating_history(match_id);
          `
        });

        if (createError) {
          throw new Error(`Failed to create player_rating_history table: ${createError.message}`);
        }

        console.log('✅ Created player_rating_history table');
      }

      // Step 2: Get all completed matches chronologically
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(
            id, name,
            team_players(player_id, players(id, name, elo_rating, skill_level))
          ),
          team2:teams!matches_team2_id_fkey(
            id, name,
            team_players(player_id, players(id, name, elo_rating, skill_level))
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (matchesError) throw matchesError;

      console.log(`📊 Processing ${matches.length} matches for player ELO history`);

      // Step 3: Process each match and calculate ELO changes
      let historyRecords = 0;
      const { badmintonEloSystem } = await import('../utils/BadmintonEloSystem');

      for (const match of matches) {
        try {
          // Get all players in this match
          const team1Players = match.team1?.team_players?.map(tp => tp.players).filter(Boolean) || [];
          const team2Players = match.team2?.team_players?.map(tp => tp.players).filter(Boolean) || [];
          const allPlayers = [...team1Players, ...team2Players];

          if (allPlayers.length === 0) continue;

          // Calculate ELO changes using the ELO system - FIXED: Use correct method name
          const eloUpdates = badmintonEloSystem.processMatchResult(
            team1Players,
            team2Players,
            match.team1_score || 0,
            match.team2_score || 0
          );

          // Insert ELO history records - FIXED: Use consistent column names
          for (const update of eloUpdates.playerEloUpdates || []) {
            try {
              const { error: insertError } = await supabase
                .from('player_rating_history')
                .insert({
                  player_id: update.playerId,
                  match_id: match.id,
                  old_rating: Math.round(update.oldRating),
                  new_rating: Math.round(update.newRating),
                  rating_change: Math.round(update.ratingChange),
                  opponent_avg_rating: Math.round(update.opponentAvgRating || 1500),
                  old_skill_level: update.oldSkillLevel,
                  new_skill_level: update.newSkillLevel,
                  created_at: match.created_at
                });

              if (!insertError) {
                historyRecords++;
              } else {
                console.warn(`Warning: Failed to insert ELO history for player ${update.playerId}:`, insertError);
              }
            } catch (insertError) {
              // Skip duplicates silently
              if (!insertError.message?.includes('duplicate') && insertError.code !== '23505') {
                console.warn(`Warning: Failed to insert ELO history for player ${update.playerId}:`, insertError);
              }
            }
          }
        } catch (matchError) {
          console.warn(`Warning: Failed to process match ${match.id}:`, matchError);
        }
      }

      return {
        success: true,
        processedMatches: matches.length,
        historyRecords: historyRecords
      };

    } catch (error) {
      console.error('💥 Player ELO history population failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Sync player ELO ratings with history (fix mismatches)
  const syncPlayerEloRatings = async () => {
    try {
      console.log('🔄 Syncing player ELO ratings with history...');

      // Get all players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, name, elo_rating');

      if (playersError) throw playersError;

      let syncedPlayers = 0;
      let syncErrors = 0;

      for (const player of players) {
        try {
          // Get the latest ELO rating for this player from history
          const { data: latestElo, error: eloError } = await supabase
        .from('player_rating_history')
            .select('new_rating, created_at')
            .eq('player_id', player.id)
            .order('created_at', { ascending: false })
        .limit(1);

          if (eloError) {
            console.warn(`   ⚠️ Error fetching ELO history for ${player.name}:`, eloError);
            continue;
    }

          if (latestElo && latestElo.length > 0) {
            const historyElo = latestElo[0].new_rating;
            const currentElo = player.elo_rating;

            if (historyElo !== currentElo) {
              console.log(`   🔄 Syncing ${player.name}: ${currentElo} → ${historyElo}`);

              const { error: updateError } = await supabase
                .from('players')
                .update({ elo_rating: historyElo })
                .eq('id', player.id);
              if (updateError) {
                console.error(`   ❌ Failed to sync ${player.name}:`, updateError);
                syncErrors++;
      } else {
                syncedPlayers++;
      }
    }
          }
        } catch (playerError) {
          console.error(`   💥 Error processing ${player.name}:`, playerError);
          syncErrors++;
        }
      }

      console.log(`✅ ELO Sync Complete: ${syncedPlayers} players synced, ${syncErrors} errors`);

      return {
        success: syncErrors === 0,
        syncedPlayers,
        syncErrors
  };

    } catch (error) {
      console.error('💥 ELO sync failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Clear player statistics
  const clearPlayerStats = async () => {
    try {
      console.log('🧹 Clearing player statistics...');

      // First, check what columns exist in the players table
      const { data: tableInfo, error: schemaError } = await supabase
        .from('players')
        .select('*')
        .limit(1);

      if (schemaError) {
        console.error('Error checking players table schema:', schemaError);
        throw schemaError;
      }

      // Build update object with only existing columns
      const updateData = {
          matches_played: 0,
          matches_won: 0,
          points: 0,
          win_percentage: 0
      };

      // Add optional columns if they exist
      if (tableInfo && tableInfo.length > 0) {
        const sampleRow = tableInfo[0];
        if ('total_points_scored' in sampleRow) {
          updateData.total_points_scored = 0;
        }
        if ('total_points_conceded' in sampleRow) {
          updateData.total_points_conceded = 0;
        }
      }
      const { error } = await supabase
        .from('players')
        .update(updateData)
        .not('id', 'is', null); // Update all players (better syntax than neq with fake UUID)
      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('💥 Clear player stats failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Clear player ELO history
  const clearPlayerEloHistory = async () => {
    try {
      console.log('🧹 Clearing player ELO history...');

      // Check if player_rating_history table exists first
      const { data: tableCheck, error: tableError } = await supabase
        .from('player_rating_history')
        .select('id')
        .limit(1);

      if (tableError && tableError.code === '42P01') {
        // Table doesn't exist, so nothing to clear
        console.log('ℹ️ player_rating_history table does not exist yet, nothing to clear');
      return { success: true };
    }

      if (tableError) {
        throw tableError;
      }

      // Use proper deletion syntax - delete all records
      const { error } = await supabase
        .from('player_rating_history')
        .delete()
        .not('id', 'is', null); // Delete all records (better than neq with fake ID)

      if (error) throw error;

      console.log('✅ Player ELO history cleared successfully');
      return { success: true };
    } catch (error) {
      console.error('💥 Clear player ELO history failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle populate player stats
  const handlePopulateStats = async () => {
    setStatus('running');
    setOperation('populate-stats');
    setMessage('Populating player statistics from match history...');
    setDetails(null);

    try {
      const result = await populatePlayerStats();
      
      if (result.success) {
        setStatus('success');
        setMessage('Player statistics populated successfully!');
        setDetails(result);
      } else {
        setStatus('error');
        setMessage(`Population failed: ${result.error || 'Unknown error'}`);
        setDetails(result);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Player stats population error:', error);
    }
  };

  // Handle populate player ELO history
  const handlePopulateEloHistory = async () => {
    setStatus('running');
    setOperation('populate-elo');
    setMessage('Populating player ELO history from matches...');
    setDetails(null);

    try {
      const result = await populatePlayerEloHistory();
      
      if (result.success) {
        setStatus('success');
        setMessage('Player ELO history populated successfully!');
        setDetails(result);
      } else {
        setStatus('error');
        setMessage(`ELO history population failed: ${result.error || 'Unknown error'}`);
        setDetails(result);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Player ELO history population error:', error);
    }
  };

  // Handle sync ELO ratings
  const handleSyncEloRatings = async () => {
    setStatus('running');
    setOperation('sync-elo');
    setMessage('Syncing player ELO ratings with history...');
    setDetails(null);

    try {
      const result = await syncPlayerEloRatings();

      if (result.success) {
        setStatus('success');
        setMessage('Player ELO ratings synced successfully!');
        setDetails(result);
      } else {
        setStatus('error');
        setMessage(`ELO sync failed: ${result.error || 'Unknown error'}`);
        setDetails(result);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Player ELO sync error:', error);
    }
};

  // Handle clear stats
  const handleClearStats = async () => {
    if (!window.confirm('Are you sure you want to clear all player statistics? This cannot be undone.')) {
      return;
    }

    setStatus('running');
    setOperation('clear-stats');
    setMessage('Clearing player statistics...');
    setDetails(null);

    try {
      const result = await clearPlayerStats();
      
      if (result.success) {
        setStatus('success');
        setMessage('Player statistics cleared successfully!');
      } else {
        setStatus('error');
        setMessage(`Clear failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Clear player stats error:', error);
    }
  };

  // Handle clear ELO history
  const handleClearEloHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all player ELO history? This cannot be undone.')) {
      return;
    }

    setStatus('running');
    setOperation('clear-elo');
    setMessage('Clearing player ELO history...');
    setDetails(null);

    try {
      const result = await clearPlayerEloHistory();
      
      if (result.success) {
        setStatus('success');
        setMessage('Player ELO history cleared successfully!');
      } else {
        setStatus('error');
        setMessage(`Clear failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      console.error('Clear player ELO history error:', error);
    }
  };

  // Handle full repopulation
  const handleRepopulate = async () => {
    if (!window.confirm('This will clear all existing player statistics and ELO history, then rebuild from scratch. Continue?')) {
      return;
    }

    setStatus('running');
    setOperation('repopulate');
    setMessage('Re-populating player data (clear + rebuild)...');
    setDetails(null);

    try {
      // Step 1: Validate database schema first
      const schemaValidation = await validateDatabaseSchema();
      if (!schemaValidation.success) {
        setStatus('error');
        setMessage(`Schema validation failed: ${schemaValidation.error}`);
        setDetails({
          error: schemaValidation.error,
          suggestion: schemaValidation.suggestion
        });
        return;
      }

      // Step 2: Clear both stats and ELO history
      setMessage('Clearing existing player data...');
      await clearPlayerStats();
      await clearPlayerEloHistory();

      // Step 3: Repopulate both
      setMessage('Rebuilding player statistics...');
      const statsResult = await populatePlayerStats();

      setMessage('Rebuilding player ELO history...');
      const eloResult = await populatePlayerEloHistory();
      
      // Step 4: Sync ELO ratings to fix any mismatches
      setMessage('Syncing ELO ratings...');
      const syncResult = await syncPlayerEloRatings();
      if (statsResult.success && eloResult.success && syncResult.success) {
        setStatus('success');
        setMessage('Player data re-populated and synced successfully!');
        setDetails({
          ...statsResult,
          historyRecords: eloResult.historyRecords,
          syncedPlayers: syncResult.syncedPlayers
        });
      } else {
        setStatus('error');
        setMessage('Re-population partially failed - check details');
        setDetails({
          statsSuccess: statsResult.success,
          eloSuccess: eloResult.success,
          syncSuccess: syncResult.success,
          statsError: statsResult.error,
          eloError: eloResult.error,
          syncError: syncResult.error,
          ...statsResult,
          historyRecords: eloResult.historyRecords || 0,
          syncedPlayers: syncResult.syncedPlayers || 0
        });
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Error: ${error.message}`);
      setDetails({
        error: error.message,
        suggestion: "Check console for detailed error information"
      });
      console.error('Player data re-population error:', error);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Clock className="animate-spin" size={20} />;
      case 'success':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'error':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return <Users size={20} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'running':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="player-stats-populator max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Player Statistics Management
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Populate player statistics and ELO history from existing matches
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-900 mb-2">What this does:</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Updates player match counts, wins, and points from completed matches</li>
                <li>• Calculates win percentages and total points scored/conceded</li>
                <li>• Creates detailed ELO rating history for each player</li>
                <li>• Enables accurate player performance charts and analysis</li>
                <li>• Updates player rankings and statistics displays</li>
                <li>• Syncs player ELO ratings with their match history</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <button
                onClick={handlePopulateStats}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trophy size={18} />
                Player Stats
              </button>
              
              <button
                onClick={handlePopulateEloHistory}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Database size={18} />
                ELO History
              </button>

              <button
                onClick={handleSyncEloRatings}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Settings size={18} />
                Sync ELO
              </button>

              <button
                onClick={handleClearStats}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={18} />
                Clear Stats
              </button>

              <button
                onClick={handleClearEloHistory}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 size={18} />
                Clear ELO History
              </button>
              <button
                onClick={handleRepopulate}
                disabled={status === 'running'}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw size={18} />
                Full Rebuild
              </button>
            </div>

            {status !== 'idle' && (
              <div className={`rounded-lg border p-4 ${getStatusColor()}`}>
                <div className="flex items-center gap-3 mb-2">
                  {getStatusIcon()}
                  <span className="font-medium">{message}</span>
                </div>
                {details && (
                  <div className="text-sm space-y-1 ml-7">
                    {details.processedPlayers !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        Processed {details.processedPlayers} players
                      </div>
                    )}
                    {details.processedMatches !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        Processed {details.processedMatches} matches
                      </div>
                    )}
                    {details.updatedPlayers !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className={details.failedUpdates > 0 ? "text-yellow-500" : "text-green-500"} />
                        Updated {details.updatedPlayers} players
                        {details.failedUpdates > 0 && ` (${details.failedUpdates} failed)`}
                      </div>
                    )}
                    {details.syncedPlayers !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-purple-500" />
                        Synced {details.syncedPlayers} player ELO ratings
                        {details.syncErrors > 0 && ` (${details.syncErrors} errors)`}
                      </div>
                    )}
                    {details.historyRecords !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        Created {details.historyRecords} ELO history records
                      </div>
                    )}
                    {details.playersWithStats !== undefined && (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-blue-500" />
                        {details.playersWithStats} players have match data
                      </div>
                    )}
                    {details.error && (
                      <div className="flex items-center gap-2">
                        <XCircle size={14} className="text-red-500" />
                        Error: {details.error}
                      </div>
                    )}
                    {details.suggestion && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs">
                        <strong>💡 Suggestion:</strong> {details.suggestion}
                      </div>
                    )}
                    {details.statsError && (
                      <div className="flex items-center gap-2">
                        <XCircle size={14} className="text-red-500" />
                        Stats Error: {details.statsError}
                      </div>
                    )}
                    {details.eloError && (
                      <div className="flex items-center gap-2">
                        <XCircle size={14} className="text-red-500" />
                        ELO Error: {details.eloError}
                      </div>
                    )}
                    {details.syncError && (
                      <div className="flex items-center gap-2">
                        <XCircle size={14} className="text-red-500" />
                        Sync Error: {details.syncError}
                      </div>
                    )}
                  </div>
                )}

                {status === 'success' && (
                  <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded text-green-800 text-sm">
                    <strong>Next steps:</strong> Go to Statistics → Player Rankings to view updated player statistics and ELO progression charts!
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
                <strong>Important:</strong>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Run "Player Stats" to update match counts, wins, and points</li>
                  <li>Run "ELO History" to create detailed ELO progression records</li>
                  <li>Run "Sync ELO" to fix any ELO rating mismatches with history</li>
                  <li>Use "Clear Stats" to reset player statistics only</li>
                  <li>Use "Clear ELO History" to reset ELO progression records only</li>
                  <li>Use "Full Rebuild" to clear everything and rebuild from scratch</li>
                  <li>Player ELO starts at skill-based initial ratings (Beginner: 1200, Intermediate: 1500, Advanced: 1800)</li>
                </ul>
              </div>

              <div className="text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded p-3">
                <strong>⚠️ Database Schema Issues?</strong><br/>
                If you get column or table errors, run the SQL migration script in your Supabase dashboard:
                <code className="block mt-1 font-mono text-xs bg-yellow-100 p-1 rounded">
                  src/sql/fix_player_schema.sql
                </code>
                This ensures all required columns and tables exist with correct data types.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsPopulator;