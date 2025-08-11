import { supabase } from './supabaseService';

/**
 * League Settings Service
 * Manages persistent league configuration settings
 */
class LeagueSettingsService {
  constructor() {
    this.settingsCache = new Map();
    this.defaultSettings = {
      elo_system: 'standard',
      league_name: 'Badminton League',
      season_start: null,
      tournament_mode: false,
      min_matches_for_ranking: 5,
      elo_k_factor: 32,
      auto_skill_updates: true
    };
  }

  /**
   * Initialize settings table if it doesn't exist
   * This should be called once during app setup
   */
  async initializeSettings() {
    try {
      // Check if we have any settings
      const { data: existingSettings, error } = await supabase
        .from('league_settings')
        .select('*')
        .limit(1);

      if (error && error.code === 'PGRST116') {
        // Table doesn't exist - this is expected for new installations
        console.log('⚠️ League settings table not found. This is normal for new installations.');
        console.log('📝 Please create the league_settings table in your Supabase database:');
        console.log(`
CREATE TABLE league_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO league_settings (setting_key, setting_value, setting_type, description) VALUES
  ('elo_system', 'standard', 'string', 'Active ELO calculation system'),
  ('league_name', 'Badminton League', 'string', 'Name of the league'),
  ('min_matches_for_ranking', '5', 'number', 'Minimum matches needed for qualified ranking'),
  ('auto_skill_updates', 'true', 'boolean', 'Automatically update skill levels based on ELO');
        `);
        return false;
      }

      if (error) {
        console.error('Error checking league settings:', error);
        return false;
      }

      // Load existing settings into cache
      if (existingSettings && existingSettings.length > 0) {
        const { data: allSettings } = await supabase
          .from('league_settings')
          .select('*');

        if (allSettings) {
          allSettings.forEach(setting => {
            let value = setting.setting_value;
            
            // Parse based on type
            if (setting.setting_type === 'number') {
              value = parseFloat(value);
            } else if (setting.setting_type === 'boolean') {
              value = value === 'true';
            }
            
            this.settingsCache.set(setting.setting_key, value);
          });
          
          console.log(`📁 Loaded ${allSettings.length} league settings from database`);
        }
      } else {
        // No settings exist, create defaults
        await this.createDefaultSettings();
      }

      return true;
    } catch (error) {
      console.error('Error initializing league settings:', error);
      return false;
    }
  }

  /**
   * Create default settings in the database
   */
  async createDefaultSettings() {
    try {
      const settingsToCreate = Object.entries(this.defaultSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: String(value),
        setting_type: typeof value === 'number' ? 'number' : 
                     typeof value === 'boolean' ? 'boolean' : 'string',
        description: this.getSettingDescription(key)
      }));

      const { error } = await supabase
        .from('league_settings')
        .insert(settingsToCreate);

      if (error) throw error;

      // Update cache
      Object.entries(this.defaultSettings).forEach(([key, value]) => {
        this.settingsCache.set(key, value);
      });

      console.log('✅ Created default league settings');
      return true;
    } catch (error) {
      console.error('Error creating default settings:', error);
      return false;
    }
  }

  /**
   * Get a setting value (from cache first, then database)
   */
  async getSetting(key, fallbackValue = null) {
    try {
      // Check cache first
      if (this.settingsCache.has(key)) {
        return this.settingsCache.get(key);
      }

      // Query database
      const { data, error } = await supabase
        .from('league_settings')
        .select('setting_value, setting_type')
        .eq('setting_key', key)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Table doesn't exist, use fallback
          return fallbackValue || this.defaultSettings[key];
        }
        throw error;
      }

      if (data) {
        let value = data.setting_value;
        
        // Parse based on type
        if (data.setting_type === 'number') {
          value = parseFloat(value);
        } else if (data.setting_type === 'boolean') {
          value = value === 'true';
        }
        
        // Cache the result
        this.settingsCache.set(key, value);
        return value;
      }

      return fallbackValue || this.defaultSettings[key];
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return fallbackValue || this.defaultSettings[key];
    }
  }

  /**
   * Set a setting value (updates both cache and database)
   */
  async setSetting(key, value) {
    try {
      const settingType = typeof value === 'number' ? 'number' : 
                         typeof value === 'boolean' ? 'boolean' : 'string';

      const { error } = await supabase
        .from('league_settings')
        .upsert({
          setting_key: key,
          setting_value: String(value),
          setting_type: settingType,
          description: this.getSettingDescription(key),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        // If table doesn't exist, just update cache
        if (error.code === 'PGRST116') {
          console.warn('League settings table not found, using cache only');
          this.settingsCache.set(key, value);
          return true;
        }
        throw error;
      }

      // Update cache
      this.settingsCache.set(key, value);
      console.log(`💾 Updated setting ${key} = ${value}`);
      return true;
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Get all settings as an object
   */
  async getAllSettings() {
    try {
      const { data, error } = await supabase
        .from('league_settings')
        .select('*');

      if (error) {
        if (error.code === 'PGRST116') {
          return this.defaultSettings;
        }
        throw error;
      }

      const settings = {};
      data.forEach(setting => {
        let value = setting.setting_value;
        
        if (setting.setting_type === 'number') {
          value = parseFloat(value);
        } else if (setting.setting_type === 'boolean') {
          value = value === 'true';
        }
        
        settings[setting.setting_key] = value;
      });

      return { ...this.defaultSettings, ...settings };
    } catch (error) {
      console.error('Error getting all settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Get setting descriptions for UI
   */
  getSettingDescription(key) {
    const descriptions = {
      elo_system: 'Active ELO calculation system (standard, fifa, conservative, aggressive, linear)',
      league_name: 'Display name for the league',
      season_start: 'Start date of current season',
      tournament_mode: 'Enable tournament bracket features',
      min_matches_for_ranking: 'Minimum matches needed for qualified player ranking',
      elo_k_factor: 'ELO K-factor for rating calculations',
      auto_skill_updates: 'Automatically update player skill levels based on ELO thresholds'
    };
    
    return descriptions[key] || 'League setting';
  }

  /**
   * Clear all cached settings (force reload from database)
   */
  clearCache() {
    this.settingsCache.clear();
    console.log('🗑️ Cleared league settings cache');
  }
}

// Create singleton instance
export const leagueSettingsService = new LeagueSettingsService();

// Initialize on import (but don't await to avoid blocking)
leagueSettingsService.initializeSettings().then(success => {
  if (!success) {
    console.warn('⚠️ League settings initialization incomplete - using defaults');
  }
});

export default leagueSettingsService;