import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
 throw new Error(
 'Missing Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
 );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase service object with all database operations
export const supabaseService = {
 // Players operations
 async getPlayers() {
 const { data, error } = await supabase
 .from('players')
 .select('*')
 .order('created_at', { ascending: false });

 if (error) throw error;
 return data || [];
 },

 async addPlayer(playerData) {
 const { data, error } = await supabase
 .from('players')
 .insert([{
 name: playerData.name,
 skill_level: playerData.skillLevel,
 email: playerData.email,
 phone: playerData.phone,
 points: 0,
 matches_played: 0,
 matches_won: 0
 }])
 .select()
 .single();

 if (error) throw error;
 return data;
 },

 async updatePlayer(id, playerData) {
 const { data, error } = await supabase
 .from('players')
 .update({
 name: playerData.name,
 skill_level: playerData.skillLevel,
 email: playerData.email,
 phone: playerData.phone,
 ...(playerData.points !== undefined && { points: playerData.points }),
 ...(playerData.matchesPlayed !== undefined && { matches_played: playerData.matchesPlayed }),
 ...(playerData.matchesWon !== undefined && { matches_won: playerData.matchesWon })
 })
 .eq('id', id)
 .select()
 .single();

 if (error) throw error;
 return data;
 },

 async deletePlayer(id) {
 const { error } = await supabase
 .from('players')
 .delete()
 .eq('id', id);

 if (error) throw error;
 },

 // Teams operations
 async getTeams() {
 const { data, error } = await supabase
 .from('teams')
 .select(`
 *,
 team_players(
 player_id,
 players(*)
 )
 `)
 .order('created_at', { ascending: false });

 if (error) throw error;
 return data || [];
 },

 async addTeam(teamData) {
 const { data: team, error: teamError } = await supabase
 .from('teams')
 .insert([{
 name: teamData.name,
 skill_combination: teamData.skillCombination,
 points: 0,
 matches_played: 0,
 matches_won: 0
 }])
 .select()
 .single();

 if (teamError) throw teamError;

 // Add team players
 if (teamData.playerIds && teamData.playerIds.length > 0) {
 const teamPlayers = teamData.playerIds.map(playerId => ({
 team_id: team.id,
 player_id: playerId
 }));

 const { error: playersError } = await supabase
 .from('team_players')
 .insert(teamPlayers);

 if (playersError) throw playersError;
 }

 // Get the team with players for return
 const { data: teamWithPlayers, error: getError } = await supabase
 .from('teams')
 .select(`
 *,
 team_players(
 player_id,
 players(*)
 )
 `)
 .eq('id', team.id)
 .single();

 if (getError) throw getError;
 return teamWithPlayers;
 },

 async updateTeam(id, teamData) {
 const { data, error } = await supabase
 .from('teams')
 .update({
 name: teamData.name,
 skill_combination: teamData.skillCombination,
 ...(teamData.points !== undefined && { points: teamData.points }),
 ...(teamData.matchesPlayed !== undefined && { matches_played: teamData.matchesPlayed }),
 ...(teamData.matchesWon !== undefined && { matches_won: teamData.matchesWon })
 })
 .eq('id', id)
 .select()
 .single();

 if (error) throw error;
 
 // Update team players if provided
 if (teamData.playerIds) {
 // First delete existing team players
 await supabase
 .from('team_players')
 .delete()
 .eq('team_id', id);

 // Then add new players
 if (teamData.playerIds.length > 0) {
 const teamPlayers = teamData.playerIds.map(playerId => ({
 team_id: id,
 player_id: playerId
 }));

 const { error: playersError } = await supabase
 .from('team_players')
 .insert(teamPlayers);

 if (playersError) throw playersError;
 }
 }

 // Get the updated team with players
 const { data: teamWithPlayers, error: getError } = await supabase
 .from('teams')
 .select(`
 *,
 team_players(
 player_id,
 players(*)
 )
 `)
 .eq('id', id)
 .single();

 if (getError) throw getError;
 return teamWithPlayers;
 },

 async deleteTeam(id) {
 // First delete team players
 await supabase
 .from('team_players')
 .delete()
 .eq('team_id', id);

 // Then delete the team
 const { error } = await supabase
 .from('teams')
 .delete()
 .eq('id', id);

 if (error) throw error;
 },

 // NEW FUNCTION: Delete all teams
 async deleteAllTeams() {
 try {
   // First delete all team_players records
   await supabase
     .from('team_players')
     .delete()
     .neq('team_id', '00000000-0000-0000-0000-000000000000');  // Delete all

   // Then delete all teams
   const { error } = await supabase
     .from('teams')
     .delete()
     .neq('id', '00000000-0000-0000-0000-000000000000');  // Delete all

   if (error) throw error;
   
   return true;
 } catch (error) {
   console.error('Error deleting all teams:', error);
   throw error;
 }
 },

 // Matches operations
 async getMatches() {
 const { data, error } = await supabase
 .from('matches')
 .select(`
 *,
 team1:teams!matches_team1_id_fkey(*),
 team2:teams!matches_team2_id_fkey(*),
 match_players(
 player_id,
 players(*)
 )
 `)
 .order('created_at', { ascending: false });

 if (error) throw error;
 return data || [];
 },

 async addMatch(matchData) {
 const { data, error } = await supabase
 .from('matches')
 .insert([{
 team1_id: matchData.team1Id,
 team2_id: matchData.team2Id,
 scheduled_date: matchData.scheduledDate,
 status: matchData.status || 'scheduled',
 team1_score: matchData.team1Score || 0,
 team2_score: matchData.team2Score || 0,
 winner_team_id: matchData.winnerTeamId || null
 }])
 .select(`
 *,
 team1:teams!matches_team1_id_fkey(*),
 team2:teams!matches_team2_id_fkey(*)
 `)
 .single();

 if (error) throw error;
 return data;
 },

 async updateMatch(id, matchData) {
 const { data, error } = await supabase
 .from('matches')
 .update({
 scheduled_date: matchData.scheduledDate,
 status: matchData.status,
 team1_score: matchData.team1Score,
 team2_score: matchData.team2Score,
 winner_team_id: matchData.winnerTeamId,
 match_date: matchData.matchDate
 })
 .eq('id', id)
 .select(`
 *,
 team1:teams!matches_team1_id_fkey(*),
 team2:teams!matches_team2_id_fkey(*),
 match_players(
 player_id,
 players(*)
 )
 `)
 .single();

 if (error) throw error;
 return data;
 },

 // Match players operations
 async addMatchPlayers(matchId, playerIds) {
 const matchPlayers = playerIds.map(playerId => ({
 match_id: matchId,
 player_id: playerId
 }));

 const { error } = await supabase
 .from('match_players')
 .insert(matchPlayers);

 if (error) throw error;
 },

 async updateMatchPlayers(matchId, playerIds) {
 // First remove existing players
 await supabase
 .from('match_players')
 .delete()
 .eq('match_id', matchId);

 // Then add new players
 if (playerIds.length > 0) {
 await this.addMatchPlayers(matchId, playerIds);
 }
 },
 
 // NEW FUNCTION: Add multiple matches at once (for round robin scheduling)
 async addMatches(matchesData) {
   const matchesToInsert = matchesData.map(match => ({
     team1_id: match.team1Id,
     team2_id: match.team2Id,
     scheduled_date: match.scheduledDate || null,
     status: match.status || 'scheduled',
     team1_score: match.team1Score || 0,
     team2_score: match.team2Score || 0,
     winner_team_id: match.winnerTeamId || null
   }));

   const { data, error } = await supabase
     .from('matches')
     .insert(matchesToInsert)
     .select();

   if (error) throw error;
   return data || [];
 }
};