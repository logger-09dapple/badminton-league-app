import { supabase } from './supabaseService.jsx';
import { badmintonEloSystem } from '../utils/BadmintonEloSystem.jsx';

/**
 * Create a new match with scores and process ELO updates
 */
export async function createMatchWithScores(matchData) {
  try {
    console.log('Creating match with scores:', matchData);
    
    // 1. First create the basic match
    const insertData = {
      team1_id: matchData.team1Id,
      team2_id: matchData.team2Id,
      scheduled_date: matchData.scheduledDate || null,
      status: 'completed', // Match with scores is always completed
      team1_score: matchData.team1Score,
      team2_score: matchData.team2Score,
      winner_team_id: matchData.team1Score > matchData.team2Score 
        ? matchData.team1Id 
        : matchData.team2Id
    };

    const { data: newMatch, error } = await supabase
      .from('matches')
      .insert([insertData])
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(
          *,
          team_players (
            player_id,
            players (*)
          )
        ),
        team2:teams!matches_team2_id_fkey(
          *,
          team_players (
            player_id,
            players (*)
          )
        )
      `)
      .single();
    
    if (error) {
      console.error('Error creating match:', error);
      throw error;
    }
    
    if (!newMatch) {
      throw new Error('Failed to create match');
    }
    
    console.log('Match created successfully:', newMatch);

    // 2. Extract player data for ELO processing
    const team1Players = newMatch.team1?.team_players?.map(tp => ({
      ...tp.players,
      elo_rating: tp.players.elo_rating || 1500,
      elo_games_played: tp.players.elo_games_played || 0,
      peak_elo_rating: tp.players.peak_elo_rating || tp.players.elo_rating || 1500,
      matches_played: tp.players.matches_played || 0,
      matches_won: tp.players.matches_won || 0,
      points: tp.players.points || 0
    })) || [];
    
    const team2Players = newMatch.team2?.team_players?.map(tp => ({
      ...tp.players,
      elo_rating: tp.players.elo_rating || 1500,
      elo_games_played: tp.players.elo_games_played || 0,
      peak_elo_rating: tp.players.peak_elo_rating || tp.players.elo_rating || 1500,
      matches_played: tp.players.matches_played || 0,
      matches_won: tp.players.matches_won || 0,
      points: tp.players.points || 0
    })) || [];
    
    if (team1Players.length !== 2 || team2Players.length !== 2) {
      console.error('Invalid player count for ELO calculation:', {
        team1Count: team1Players.length,
        team2Count: team2Players.length
      });
      return newMatch; // Return match without ELO processing
    }

    // 3. Calculate ELO updates
    console.log('Calculating ELO updates for players:', {
      team1: team1Players.map(p => p.name),
      team2: team2Players.map(p => p.name)
    });
    
    const eloUpdates = badmintonEloSystem.processMatchResult(
      team1Players,
      team2Players,
      matchData.team1Score,
      matchData.team2Score
    );
    
    console.log('ELO updates calculated:', eloUpdates);

    // 4. Apply ELO updates to players
    const historyRecords = [];
    const skillLevelChanges = [];
    
    for (const update of eloUpdates) {
      const player = team1Players.concat(team2Players).find(p => p.id === update.playerId);
      if (!player) continue;
      
      const isWinner = update.ratingChange > 0;
      
      // Update player stats and ELO
      await supabase
        .from('players')
        .update({
          elo_rating: update.newRating,
          peak_elo_rating: Math.max(update.newRating, player.peak_elo_rating),
          skill_level: update.newSkillLevel,
          elo_games_played: player.elo_games_played + 1,
          matches_played: player.matches_played + 1,
          matches_won: isWinner ? player.matches_won + 1 : player.matches_won,
          points: isWinner ? player.points + 1 : player.points,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.playerId);
      
      // Record ELO history
      historyRecords.push({
        player_id: update.playerId,
        match_id: newMatch.id,
        old_rating: update.oldRating,
        new_rating: update.newRating,
        rating_change: update.ratingChange,
        old_skill_level: update.oldSkillLevel,
        new_skill_level: update.newSkillLevel,
        opponent_avg_rating: update.opponentAvgRating,
        k_factor: update.kFactor
      });
      
      // Track skill level changes
      if (update.oldSkillLevel !== update.newSkillLevel) {
        skillLevelChanges.push({
          player_id: update.playerId,
          old_skill_level: update.oldSkillLevel,
          new_skill_level: update.newSkillLevel,
          elo_rating: update.newRating,
          reason: 'Match completion ELO update',
          auto_applied: true
        });
      }
    }
    
    // 5. Record history and skill changes
    if (historyRecords.length > 0) {
      await supabase
        .from('player_rating_history')
        .insert(historyRecords);
    }
    
    if (skillLevelChanges.length > 0) {
      await supabase
        .from('skill_level_changes')
        .insert(skillLevelChanges);
    }

    // 6. Update team statistics
    const winnerId = newMatch.winner_team_id;
    const loserId = winnerId === newMatch.team1_id 
      ? newMatch.team2_id 
      : newMatch.team1_id;
      
    // Get both teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, matches_played, matches_won, points')
      .in('id', [winnerId, loserId]);
      
    if (!teamsError && teams) {
      const winner = teams.find(t => t.id === winnerId) || {
        matches_played: 0, matches_won: 0, points: 0 
      };
      
      const loser = teams.find(t => t.id === loserId) || { 
        matches_played: 0 
      };
      
      // Update winner
      await supabase
        .from('teams')
        .update({
          matches_played: (winner.matches_played || 0) + 1,
          matches_won: (winner.matches_won || 0) + 1,
          points: (winner.points || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', winnerId);
      
      // Update loser
      await supabase
        .from('teams')
        .update({
          matches_played: (loser.matches_played || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', loserId);
    }

    // 7. Fetch the updated match with all data
    const { data: updatedMatch, error: fetchError } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(*),
        team2:teams!matches_team2_id_fkey(*),
        winner_team:teams!matches_winner_team_id_fkey(*)
      `)
      .eq('id', newMatch.id)
      .single();
    
    if (fetchError) {
      console.error('Error fetching updated match:', fetchError);
      return newMatch;
    }
    
    return updatedMatch || newMatch;
    
  } catch (error) {
    console.error('Error in createMatchWithScores:', error);
    throw error;
  }
}