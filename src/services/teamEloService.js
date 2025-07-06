import { supabase } from './supabaseService';
import { teamEloSystem } from '../utils/TeamEloSystem';

export const teamEloService = {
  /**
   * Create team_elo_history table if it doesn't exist
   */
  async createTeamEloHistoryTable() {
    try {
      console.log('Creating team_elo_history table...');
      
      const { error } = await supabase.rpc('create_team_elo_history_table');
      
      if (error && !error.message.includes('already exists')) {
        console.error('Error creating team_elo_history table:', error);
        return false;
      }
      
      console.log('Team ELO history table ready');
      return true;
    } catch (error) {
      console.error('Error in createTeamEloHistoryTable:', error);
      return false;
    }
  },

  /**
   * Initialize team ELO ratings from player averages
   */
  async initializeTeamEloRatings() {
    try {
      console.log('Initializing team ELO ratings...');

      // Get all teams with their players
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
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
        `);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return false;
      }

      const updates = [];

      for (const team of teams) {
        // Skip if team already has ELO rating
        if (team.team_elo_rating) {
          console.log(`Team ${team.name} already has ELO rating: ${team.team_elo_rating}`);
          continue;
        }

        // Calculate initial ELO from player averages
        const initialElo = teamEloSystem.getTeamEloRating(team);
        
        updates.push({
          id: team.id,
          team_elo_rating: initialElo,
          peak_team_elo_rating: initialElo,
          team_elo_games_played: 0
        });

        console.log(`Initializing team ${team.name} with ELO: ${initialElo}`);
      }

      if (updates.length > 0) {
        const { error: updateError } = await supabase
          .from('teams')
          .upsert(updates);

        if (updateError) {
          console.error('Error updating team ELO ratings:', updateError);
          return false;
        }

        console.log(`Initialized ${updates.length} team ELO ratings`);
      }

      return true;
    } catch (error) {
      console.error('Error in initializeTeamEloRatings:', error);
      return false;
    }
  },

  /**
   * Populate team ELO history from existing completed matches
   */
  async populateTeamEloHistoryFromMatches() {
    try {
      console.log('Populating team ELO history from existing matches...');

      // Get all completed matches ordered by creation date
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
            team_players (
              players (
                id,
                name,
                elo_rating
              )
            )
          )
        `)
        .eq('status', 'completed')
        .not('team1_score', 'is', null)
        .not('team2_score', 'is', null)
        .order('created_at', { ascending: true });

      if (matchesError) {
        console.error('Error fetching matches:', matchesError);
        return false;
      }

      console.log(`Found ${matches.length} completed matches to process`);

      // Keep track of current team ELO ratings
      const teamEloRatings = new Map();

      // Initialize all teams with their starting ELO
      const uniqueTeamIds = new Set();
      matches.forEach(match => {
        uniqueTeamIds.add(match.team1_id);
        uniqueTeamIds.add(match.team2_id);
      });

      // Get current team data to initialize ratings
      const { data: currentTeams, error: currentTeamsError } = await supabase
        .from('teams')
        .select(`
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
        `)
        .in('id', Array.from(uniqueTeamIds));

      if (currentTeamsError) {
        console.error('Error fetching current teams:', currentTeamsError);
        return false;
      }

      // Initialize team ratings map
      currentTeams.forEach(team => {
        const initialRating = team.team_elo_rating || teamEloSystem.getTeamEloRating(team);
        teamEloRatings.set(team.id, {
          currentRating: initialRating,
          gamesPlayed: 0,
          peakRating: initialRating
        });
      });

      const historyRecords = [];
      const teamUpdates = [];

      // Process each match chronologically
      for (const match of matches) {
        try {
          // Get team data with current ratings
          const team1Data = {
            id: match.team1_id,
            name: match.team1?.name || 'Team 1',
            team_elo_rating: teamEloRatings.get(match.team1_id)?.currentRating || 1500,
            matches_played: teamEloRatings.get(match.team1_id)?.gamesPlayed || 0,
            team_players: match.team1?.team_players || []
          };

          const team2Data = {
            id: match.team2_id,
            name: match.team2?.name || 'Team 2',
            team_elo_rating: teamEloRatings.get(match.team2_id)?.currentRating || 1500,
            matches_played: teamEloRatings.get(match.team2_id)?.gamesPlayed || 0,
            team_players: match.team2?.team_players || []
          };

          // Calculate ELO updates
          const eloUpdates = teamEloSystem.processTeamMatchResult(
            team1Data,
            team2Data,
            match.team1_score,
            match.team2_score
          );

          // Process each team's ELO update
          eloUpdates.forEach(update => {
            if (update.error) {
              console.warn(`Skipping update for team ${update.teamName} due to error: ${update.error}`);
              return;
            }

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
              reason: 'Historical match ELO calculation'
            });

            // Update team rating in our tracking map
            const teamRating = teamEloRatings.get(update.teamId);
            if (teamRating) {
              teamRating.currentRating = update.newRating;
              teamRating.gamesPlayed += 1;
              teamRating.peakRating = Math.max(teamRating.peakRating, update.newRating);
            }
          });

          if (matches.indexOf(match) % 10 === 0) {
            console.log(`Processed ${matches.indexOf(match) + 1}/${matches.length} matches`);
          }

        } catch (matchError) {
          console.error(`Error processing match ${match.id}:`, matchError);
          continue;
        }
      }

      // Insert history records in batches
      if (historyRecords.length > 0) {
        console.log(`Inserting ${historyRecords.length} team ELO history records...`);
        
        const batchSize = 100;
        for (let i = 0; i < historyRecords.length; i += batchSize) {
          const batch = historyRecords.slice(i, i + batchSize);
          
          const { error: insertError } = await supabase
            .from('team_elo_history')
            .insert(batch);

          if (insertError) {
            console.error(`Error inserting history batch ${i / batchSize + 1}:`, insertError);
            // Continue with other batches
          } else {
            console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(historyRecords.length / batchSize)}`);
          }
        }
      }

      // Update teams with final ELO ratings and stats
      teamEloRatings.forEach((rating, teamId) => {
        teamUpdates.push({
          id: teamId,
          team_elo_rating: rating.currentRating,
          peak_team_elo_rating: rating.peakRating,
          team_elo_games_played: rating.gamesPlayed
        });
      });

      if (teamUpdates.length > 0) {
        const { error: updateError } = await supabase
          .from('teams')
          .upsert(teamUpdates);

        if (updateError) {
          console.error('Error updating team final ELO ratings:', updateError);
        } else {
          console.log(`Updated ${teamUpdates.length} teams with final ELO ratings`);
        }
      }

      console.log('Team ELO history population completed successfully');
      return true;

    } catch (error) {
      console.error('Error in populateTeamEloHistoryFromMatches:', error);
      return false;
    }
  },

  /**
   * Add team ELO columns to teams table if they don't exist
   */
  async addTeamEloColumns() {
    try {
      console.log('Adding team ELO columns to teams table...');
      
      const { error } = await supabase.rpc('add_team_elo_columns');
      
      if (error && !error.message.includes('already exists')) {
        console.error('Error adding team ELO columns:', error);
        return false;
      }
      
      console.log('Team ELO columns ready');
      return true;
    } catch (error) {
      console.error('Error in addTeamEloColumns:', error);
      return false;
    }
  },

  /**
   * Get team ELO history for a specific team
   */
  async getTeamEloHistory(teamId) {
    try {
      const { data, error } = await supabase
        .from('team_elo_history')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching team ELO history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTeamEloHistory:', error);
      return [];
    }
  },

  /**
   * Record team ELO changes for a match
   */
  async recordTeamEloChanges(matchId, teamEloUpdates) {
    try {
      if (!Array.isArray(teamEloUpdates) || teamEloUpdates.length === 0) {
        console.warn('No team ELO updates to record');
        return true;
      }

      const historyRecords = teamEloUpdates.map(update => ({
        team_id: update.teamId,
        match_id: matchId,
        old_team_elo_rating: update.oldRating,
        new_team_elo_rating: update.newRating,
        team_elo_change: update.ratingChange,
        opponent_team_id: teamEloUpdates.find(u => u.teamId !== update.teamId)?.teamId,
        opponent_team_elo_rating: update.opponentRating,
        match_outcome: update.won ? 'win' : 'loss',
        expected_score: update.expectedScore,
        actual_score: update.actualScore,
        k_factor: update.kFactor,
        reason: 'Match completion team ELO update',
        auto_applied: true
      }));

      const { error } = await supabase
        .from('team_elo_history')
        .insert(historyRecords);

      if (error) {
        console.error('Error recording team ELO history:', error);
        return false;
      }

      console.log(`Recorded ${historyRecords.length} team ELO history records`);
      return true;
    } catch (error) {
      console.error('Error in recordTeamEloChanges:', error);
      return false;
    }
  },

  /**
   * Initialize complete team ELO system
   */
  async initializeCompleteTeamEloSystem() {
    try {
      console.log('Initializing complete team ELO system...');
      
      // Step 1: Add team ELO columns
      await this.addTeamEloColumns();
      
      // Step 2: Create team ELO history table
      await this.createTeamEloHistoryTable();
      
      // Step 3: Initialize team ELO ratings
      await this.initializeTeamEloRatings();
      
      // Step 4: Populate history from existing matches
      await this.populateTeamEloHistoryFromMatches();
      
      console.log('Team ELO system initialization completed');
      return true;
    } catch (error) {
      console.error('Error initializing team ELO system:', error);
      return false;
    }
  }
};