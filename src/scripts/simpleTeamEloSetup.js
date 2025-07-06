import { supabase } from '../services/supabaseService';

/**
 * Simple Team ELO setup that works with any schema
 */
export const simpleTeamEloSetup = async () => {
  try {
    console.log('🚀 Simple Team ELO Setup Starting...');
    
    // Step 1: Add columns to teams table (safe - won't fail if they exist)
    console.log('📝 Step 1: Adding team ELO columns...');
    
    const addColumnsSQL = `
      -- Add team ELO columns (safe - will skip if they exist)
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_elo_rating') THEN
          ALTER TABLE teams ADD COLUMN team_elo_rating INTEGER DEFAULT 1500;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'peak_team_elo_rating') THEN
          ALTER TABLE teams ADD COLUMN peak_team_elo_rating INTEGER DEFAULT 1500;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_elo_games_played') THEN
          ALTER TABLE teams ADD COLUMN team_elo_games_played INTEGER DEFAULT 0;
        END IF;
      END $$;
    `;
    
    const { error: columnsError } = await supabase.rpc('exec_sql', { sql: addColumnsSQL });
    if (columnsError) {
      console.error('❌ Error adding columns:', columnsError);
      throw columnsError;
    }
    console.log('✅ Team ELO columns added/verified');
    
    // Step 2: Create team_elo_history table (auto-detect UUID vs INTEGER)
    console.log('📝 Step 2: Creating team ELO history table...');
    
    // First, check what type the teams.id column is
    const { data: schemaInfo } = await supabase
      .from('information_schema.columns')
      .select('data_type')
      .eq('table_name', 'teams')
      .eq('column_name', 'id')
      .single();
    
    const idType = schemaInfo?.data_type === 'uuid' ? 'UUID' : 'INTEGER';
    console.log(`🔍 Detected ID type: ${idType}`);
    
    const createTableSQL = `
      -- Create team_elo_history table with correct ID type
      CREATE TABLE IF NOT EXISTS team_elo_history (
        id SERIAL PRIMARY KEY,
        team_id ${idType} NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        match_id ${idType} NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        old_team_elo_rating INTEGER NOT NULL DEFAULT 1500,
        new_team_elo_rating INTEGER NOT NULL DEFAULT 1500,
        team_elo_change INTEGER NOT NULL DEFAULT 0,
        opponent_team_id ${idType} REFERENCES teams(id) ON DELETE SET NULL,
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
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_team_elo_history_team_id ON team_elo_history(team_id);
      CREATE INDEX IF NOT EXISTS idx_team_elo_history_match_id ON team_elo_history(match_id);
      CREATE INDEX IF NOT EXISTS idx_team_elo_history_created_at ON team_elo_history(created_at);
    `;
    
    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    if (tableError) {
      console.error('❌ Error creating table:', tableError);
      throw tableError;
    }
    console.log('✅ Team ELO history table created');
    
    // Step 3: Initialize team ELO ratings from player averages
    console.log('📝 Step 3: Initializing team ELO ratings...');
    
    // Get all teams with their players
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_elo_rating,
        team_players (
          players (
            elo_rating
          )
        )
      `);
    
    if (teamsError) {
      console.error('❌ Error fetching teams:', teamsError);
      throw teamsError;
    }
    
    const teamUpdates = [];
    
    teams.forEach(team => {
      // Skip if team already has ELO rating
      if (team.team_elo_rating && team.team_elo_rating !== 1500) {
        console.log(`⏭️ Team ${team.name} already has ELO: ${team.team_elo_rating}`);
        return;
      }
      
      // Calculate ELO from player averages
      const playerElos = team.team_players
        ?.map(tp => tp.players?.elo_rating)
        .filter(elo => elo && elo > 0) || [];
      
      let teamElo = 1500;
      if (playerElos.length > 0) {
        teamElo = Math.round(playerElos.reduce((sum, elo) => sum + elo, 0) / playerElos.length);
      }
      
      teamUpdates.push({
        id: team.id,
        team_elo_rating: teamElo,
        peak_team_elo_rating: teamElo,
        team_elo_games_played: 0
      });
      
      console.log(`🎯 Initializing ${team.name}: ${teamElo} ELO`);
    });
    
    if (teamUpdates.length > 0) {
      const { error: updateError } = await supabase
        .from('teams')
        .upsert(teamUpdates);
      
      if (updateError) {
        console.error('❌ Error updating teams:', updateError);
        throw updateError;
      }
      
      console.log(`✅ Initialized ${teamUpdates.length} team ELO ratings`);
    } else {
      console.log('ℹ️ No teams needed ELO initialization');
    }
    
    console.log('🎉 Simple Team ELO Setup Complete!');
    console.log('📊 Your teams now have:');
    console.log('   • Dedicated team ELO ratings');
    console.log('   • Team ELO history tracking table');
    console.log('   • Peak ELO tracking');
    console.log('');
    console.log('🔄 Next: All future matches will automatically update team ELO');
    
    return true;
    
  } catch (error) {
    console.error('💥 Simple Team ELO Setup failed:', error);
    return false;
  }
};

// Export for browser console
if (typeof window !== 'undefined') {
  window.simpleTeamEloSetup = simpleTeamEloSetup;
}