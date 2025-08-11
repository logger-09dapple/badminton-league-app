# Database Setup: League Settings Persistence

To make your ELO system selection persist across browser sessions and devices, you need to create a `league_settings` table in your Supabase database.

## Option 1: Automatic Setup (Recommended)

The system will automatically detect if the table is missing and show you the SQL to create it. Just:

1. Go to your Setup page
2. Select your preferred ELO system
3. If you see a warning about the settings table, follow the instructions

## Option 2: Manual Setup

### Step 1: Create the Table

Go to your Supabase dashboard → SQL Editor and run this command:

```sql
-- Create league settings table
CREATE TABLE league_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE league_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access on league_settings" ON league_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow public write access on league_settings" ON league_settings
    FOR ALL USING (true);
```

### Step 2: Insert Default Settings

```sql
-- Insert default league settings
INSERT INTO league_settings (setting_key, setting_value, setting_type, description) VALUES
  ('elo_system', 'standard', 'string', 'Active ELO calculation system'),
  ('league_name', 'Badminton League', 'string', 'Name of the league'),
  ('min_matches_for_ranking', '5', 'number', 'Minimum matches needed for qualified ranking'),
  ('auto_skill_updates', 'true', 'boolean', 'Automatically update skill levels based on ELO'),
  ('elo_k_factor', '32', 'number', 'ELO K-factor for rating calculations'),
  ('tournament_mode', 'false', 'boolean', 'Enable tournament bracket features');
```

## Benefits of Database Persistence

### ✅ With Database Persistence:
- ELO system choice persists across all devices
- Settings survive browser cache clearing
- Multiple users see the same league configuration
- Professional setup for shared leagues

### ⚠️ Without Database (localStorage only):
- Settings only persist on the current device/browser
- Clearing browser data resets to default
- Each user must set their preferred system separately
- Still functional, just not as convenient

## Verification

After setting up the table:

1. Go to Setup page
2. Change your ELO system (e.g., from Standard to FIFA)
3. Refresh the page
4. The selected system should remain active
5. Check for the "💾 SAVED" indicator in the ELO system banner

## Troubleshooting

### "Table doesn't exist" error
- Run the CREATE TABLE statement above
- Make sure you're connected to the correct Supabase project
- Check that your environment variables (.env) are correct

### "Permission denied" error
- Make sure RLS policies allow your application to read/write
- In development, you can temporarily disable RLS: `ALTER TABLE league_settings DISABLE ROW LEVEL SECURITY;`

### System keeps resetting to Standard
- Check browser console for errors
- Verify the INSERT statements ran successfully
- Try manually updating: `UPDATE league_settings SET setting_value = 'fifa' WHERE setting_key = 'elo_system';`

## Future Enhancements

This settings system can be extended to store:
- League name and season information
- Tournament configurations
- Custom ELO parameters
- Match scheduling preferences
- Player skill level thresholds
- Notification settings

The `league_settings` table is designed to be flexible and accommodate any future configuration needs.