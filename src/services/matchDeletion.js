import { supabase } from './supabaseService';

/**
 * Enhanced match deletion functionality
 */
export async function deleteMatchWithStats(matchId, wasCompleted = false) {
  try {
    console.log(`Deleting match ${matchId}, wasCompleted: ${wasCompleted}`);
    
    if (wasCompleted) {
      // Fetch match details to reverse ELO changes
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(
            id, name,
            team_players (
              player_id,
              players (id, name, elo_rating)
            )
          ),
          team2:teams!matches_team2_id_fkey(
            id, name,
            team_players (
              player_id,
              players (id, name, elo_rating)
            )
          )
        `)
        .eq('id', matchId)
        .single();
      
      if (matchError) {
        console.error('Error fetching match for deletion:', matchError);
        throw matchError;
      }
      
      if (!match) {
        throw new Error('Match not found');
      }
      
      console.log('Fetched match for ELO reversal:', match);
      
      // Get player rating history for this match
      const { data: ratingHistory, error: ratingError } = await supabase
        .from('player_rating_history')
        .select('*')
        .eq('match_id', matchId);
      
      if (ratingError) {
        console.error('Error fetching rating history:', ratingError);
        throw ratingError;
      }
      
      // Reverse ELO changes for all players involved
      if (ratingHistory && ratingHistory.length > 0) {
        console.log('Found rating history to reverse:', ratingHistory.length, 'records');
        
        // Process each player's rating change
        for (const record of ratingHistory) {
          // Reverse the rating change
          await reversePlayerRating(record);
        }
        
        console.log('Successfully reversed all player ratings');
      }
      
      // Update team stats
      if (match.winner_team_id) {
        // Update winner team (decrement wins)
        await updateTeamStatsForMatchDeletion(match.winner_team_id, true);
        
        // Update loser team
        const loserTeamId = match.winner_team_id === match.team1_id ? match.team2_id : match.team1_id;
        await updateTeamStatsForMatchDeletion(loserTeamId, false);
      }
    }
    
    // Finally delete the match
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);
    
    if (error) {
      console.error('Error deleting match:', error);
      throw error;
    }
    
    console.log('Match deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteMatchWithStats:', error);
    throw error;
  }
}

/**
 * Helper function to reverse player ELO ratings
 */
async function reversePlayerRating(ratingRecord) {
  try {
    console.log(`Reversing rating for player ${ratingRecord.player_id}: ${ratingRecord.new_rating} -> ${ratingRecord.old_rating}`);
    
    // Get current player data first
    const { data: player, error: fetchError } = await supabase
      .from('players')
      .select('matches_played, matches_won, points, elo_games_played')
      .eq('id', ratingRecord.player_id)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Calculate new values (ensure we don't go below 0)
    const newMatchesPlayed = Math.max(0, (player.matches_played || 0) - 1);
    const newMatchesWon = ratingRecord.rating_change > 0
      ? Math.max(0, (player.matches_won || 0) - 1)
      : player.matches_won || 0;
    const newPoints = ratingRecord.rating_change > 0
      ? Math.max(0, (player.points || 0) - 1)
      : player.points || 0;
    const newGamesPlayed = Math.max(0, (player.elo_games_played || 0) - 1);
    
    // Update player with explicit values instead of using raw()
    const { error } = await supabase
      .from('players')
      .update({
        elo_rating: ratingRecord.old_rating,
        elo_games_played: newGamesPlayed,
        matches_played: newMatchesPlayed,
        matches_won: newMatchesWon,
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', ratingRecord.player_id);
    
    if (error) {
      console.error('Error reversing player rating:', error);
      throw error;
    }
    
    // Delete the rating history record
    await supabase
      .from('player_rating_history')
      .delete()
      .eq('id', ratingRecord.id);
    
    return true;
  } catch (error) {
    console.error('Error in reversePlayerRating:', error);
    throw error;
  }
}

/**
 * Helper function for updating team stats when a match is deleted
 */
async function updateTeamStatsForMatchDeletion(teamId, wasWinner) {
  try {
    const { data: team, error: fetchError } = await supabase
      .from('teams')
      .select('matches_played, matches_won, points')
      .eq('id', teamId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Ensure we don't go below 0 for any statistic
    const newMatches = Math.max(0, (team.matches_played || 0) - 1);
    const newWins = wasWinner ? Math.max(0, (team.matches_won || 0) - 1) : (team.matches_won || 0);
    const newPoints = wasWinner ? Math.max(0, (team.points || 0) - 1) : (team.points || 0);
    
    const { error } = await supabase
      .from('teams')
      .update({
        matches_played: newMatches,
        matches_won: newWins,
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error updating team stats for match deletion:', error);
    throw error;
  }
}