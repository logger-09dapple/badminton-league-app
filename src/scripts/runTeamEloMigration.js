import { supabase } from '../services/supabaseService';
import { teamEloService } from '../services/teamEloService';

/**
 * Script to run the team ELO migration manually
 * This can be executed from the browser console or as a one-time setup
 */
export const runTeamEloMigration = async () => {
  try {
    console.log('🚀 Starting Team ELO System Migration...');
    
    // Step 1: Create the SQL functions and tables
    console.log('📝 Step 1: Creating database functions and tables...');
    
    // Execute the SQL functions
    const sqlFunctions = `
      -- Function to create team_elo_history table
      CREATE OR REPLACE FUNCTION create_team_elo_history_table()
      RETURNS void AS $$
      BEGIN
        -- Create team_elo_history table if it doesn't exist
        CREATE TABLE IF NOT EXISTS team_elo_history (
          id SERIAL PRIMARY KEY,
          team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
          old_team_elo_rating INTEGER NOT NULL DEFAULT 1500,
          new_team_elo_rating INTEGER NOT NULL DEFAULT 1500,
          team_elo_change INTEGER NOT NULL DEFAULT 0,
          opponent_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
          opponent_team_elo_rating INTEGER DEFAULT 1500,
          match_outcome VARCHAR(10) CHECK (match_outcome IN ('win', 'loss', 'draw')),
          expected_score DECIMAL(5,3) DEFAULT 0.5,
          actual_score DECIMAL(3,1) DEFAULT 0.5,
          k_factor INTEGER DEFAULT 24,
          reason VARCHAR(255) DEFAULT 'Team ELO update',
          auto_applied BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_team_elo_history_team_id ON team_elo_history(team_id);
        CREATE INDEX IF NOT EXISTS idx_team_elo_history_match_id ON team_elo_history(match_id);
        CREATE INDEX IF NOT EXISTS idx_team_elo_history_created_at ON team_elo_history(created_at);
        CREATE INDEX IF NOT EXISTS idx_team_elo_history_team_match ON team_elo_history(team_id, match_id);

        RAISE NOTICE 'team_elo_history table created successfully';
      END;
      $$ LANGUAGE plpgsql;

      -- Function to add team ELO columns to teams table
      CREATE OR REPLACE FUNCTION add_team_elo_columns()
      RETURNS void AS $$
      BEGIN
        -- Add team_elo_rating column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'teams' AND column_name = 'team_elo_rating'
        ) THEN
          ALTER TABLE teams ADD COLUMN team_elo_rating INTEGER DEFAULT 1500;
          RAISE NOTICE 'Added team_elo_rating column to teams table';
        END IF;

        -- Add peak_team_elo_rating column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'teams' AND column_name = 'peak_team_elo_rating'
        ) THEN
          ALTER TABLE teams ADD COLUMN peak_team_elo_rating INTEGER DEFAULT 1500;
          RAISE NOTICE 'Added peak_team_elo_rating column to teams table';
        END IF;

        -- Add team_elo_games_played column if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'teams' AND column_name = 'team_elo_games_played'
        ) THEN
          ALTER TABLE teams ADD COLUMN team_elo_games_played INTEGER DEFAULT 0;
          RAISE NOTICE 'Added team_elo_games_played column to teams table';
        END IF;

        -- Add indexes for team ELO columns
        CREATE INDEX IF NOT EXISTS idx_teams_team_elo_rating ON teams(team_elo_rating);
        CREATE INDEX IF NOT EXISTS idx_teams_peak_team_elo_rating ON teams(peak_team_elo_rating);

        RAISE NOTICE 'Team ELO columns added successfully';
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Execute the SQL
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: sqlFunctions });
    if (sqlError) {
      console.error('❌ Error creating SQL functions:', sqlError);
      throw sqlError;
    }

    // Step 2: Execute the functions
    console.log('🔧 Step 2: Executing database setup functions...');
    
    const { error: setupError1 } = await supabase.rpc('add_team_elo_columns');
    if (setupError1 && !setupError1.message.includes('already exists')) {
      console.error('❌ Error adding team ELO columns:', setupError1);
      throw setupError1;
    }

    const { error: setupError2 } = await supabase.rpc('create_team_elo_history_table');
    if (setupError2 && !setupError2.message.includes('already exists')) {
      console.error('❌ Error creating team ELO history table:', setupError2);
      throw setupError2;
    }

    // Step 3: Initialize team ELO ratings
    console.log('⚡ Step 3: Initializing team ELO ratings...');
    const initSuccess = await teamEloService.initializeTeamEloRatings();
    if (!initSuccess) {
      console.warn('⚠️ Warning: Team ELO rating initialization had issues');
    }

    // Step 4: Populate team ELO history from existing matches
    console.log('📚 Step 4: Populating team ELO history from existing matches...');
    const historySuccess = await teamEloService.populateTeamEloHistoryFromMatches();
    if (!historySuccess) {
      console.warn('⚠️ Warning: Team ELO history population had issues');
    }

    console.log('✅ Team ELO System Migration completed successfully!');
    console.log('🎯 Teams now have dedicated ELO ratings separate from player averages');
    console.log('📈 Team ELO history is being tracked for all future matches');
    
    return true;
  } catch (error) {
    console.error('💥 Team ELO Migration failed:', error);
    return false;
  }
};

/**
 * Simple version that just runs the service initialization
 */
export const quickTeamEloSetup = async () => {
  try {
    console.log('🚀 Quick Team ELO Setup...');
    const success = await teamEloService.initializeCompleteTeamEloSystem();
    
    if (success) {
      console.log('✅ Team ELO system is ready!');
    } else {
      console.log('❌ Team ELO setup failed');
    }
    
    return success;
  } catch (error) {
    console.error('Error in quick setup:', error);
    return false;
  }
};

// Auto-export for browser console usage
if (typeof window !== 'undefined') {
  window.runTeamEloMigration = runTeamEloMigration;
  window.quickTeamEloSetup = quickTeamEloSetup;
}