import { supabase } from '../services/supabaseService';

/**
 * Fetch player ELO history for matches
 */
export const fetchPlayerEloHistory = async (playerId, matchIds) => {
  try {
    if (!playerId || !matchIds || matchIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('player_rating_history')
      .select('match_id, old_elo_rating, new_elo_rating, elo_change, created_at')
      .eq('player_id', playerId)
      .in('match_id', matchIds)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching player ELO history:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchPlayerEloHistory:', error);
    return [];
  }
};

/**
 * Fetch team ELO history for matches
 */
export const fetchTeamEloHistory = async (teamId, matchIds) => {
  try {
    if (!teamId || !matchIds || matchIds.length === 0) return [];
    
    const { data, error } = await supabase
      .from('team_elo_history')
      .select('match_id, old_team_elo_rating, new_team_elo_rating, team_elo_change, created_at')
      .eq('team_id', teamId)
      .in('match_id', matchIds)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching team ELO history:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchTeamEloHistory:', error);
    return [];
  }
};

/**
 * Enhanced performance trends calculation using actual ELO history
 */
export const calculatePerformanceTrendsWithHistory = async (matches, playerId = null, teamId = null, players = null, teams = null) => {
  if (!matches || matches.length === 0) return [];

  const relevantMatches = matches
    .filter(match => {
      if (match.status !== 'completed') return false;
      
      if (playerId) {
        return match.team1?.team_players?.some(tp => tp.player_id === playerId) ||
               match.team2?.team_players?.some(tp => tp.player_id === playerId);
      }
      if (teamId) {
        return match.team1_id === teamId || match.team2_id === teamId;
      }
      return true;
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (relevantMatches.length === 0) return [];

  // Fetch actual ELO history
  const matchIds = relevantMatches.map(m => m.id);
  let eloHistory = [];
  
  if (playerId) {
    eloHistory = await fetchPlayerEloHistory(playerId, matchIds);
  } else if (teamId) {
    eloHistory = await fetchTeamEloHistory(teamId, matchIds);
  }

  const trends = [];
  let runningStats = {
    wins: 0,
    losses: 0,
    totalPoints: 0,
    totalMatches: 0,
    currentEloRating: null
  };

  // Initialize proper starting ELO
  let initialRating = 1500;
  let finalRating = 1500;
  
  if (playerId && players) {
    const player = players.find(p => p.id === playerId);
    finalRating = player?.elo_rating || 1500;
    
    const skillLevel = player?.skill_level?.toLowerCase();
    if (skillLevel === 'advanced') {
      initialRating = 1800;
    } else if (skillLevel === 'beginner') {
      initialRating = 1200;
    }
    
    runningStats.currentEloRating = initialRating;
  } else if (teamId && teams) {
    const team = teams.find(t => t.id === teamId);
    finalRating = team?.team_elo_rating || 1500;
    runningStats.currentEloRating = initialRating;
  }

  const didPlayerWin = (match, playerId) => {
    const playerInTeam1 = match.team1?.team_players?.some(tp => tp.player_id === playerId);
    return playerInTeam1 ? match.winner_team_id === match.team1_id : match.winner_team_id === match.team2_id;
  };

  const getPointsScored = (match, playerId, teamId) => {
    if (playerId) {
      const playerInTeam1 = match.team1?.team_players?.some(tp => tp.player_id === playerId);
      return playerInTeam1 ? (match.team1_score || 0) : (match.team2_score || 0);
    }
    if (teamId) {
      return match.team1_id === teamId ? (match.team1_score || 0) : (match.team2_score || 0);
    }
    return 0;
  };

  relevantMatches.forEach((match, index) => {
    const isWin = (playerId && didPlayerWin(match, playerId)) ||
                  (teamId && match.winner_team_id === teamId);
    
    runningStats.totalMatches++;
    if (isWin) {
      runningStats.wins++;
    } else {
      runningStats.losses++;
    }

    const pointsScored = getPointsScored(match, playerId, teamId);
    runningStats.totalPoints += pointsScored;

    const team1Name = match.team1?.name || 'Team 1';
    const team2Name = match.team2?.name || 'Team 2';
    const matchLabel = `${team1Name} vs ${team2Name}`;

    // Use actual ELO history if available
    let eloRating = runningStats.currentEloRating;
    let eloChange = 0;
    let previousElo = runningStats.currentEloRating;
    
    const matchEloRecord = eloHistory.find(record => record.match_id === match.id);
    
    if (matchEloRecord) {
      // Use actual stored ELO data
      if (playerId) {
        previousElo = matchEloRecord.old_elo_rating;
        eloRating = matchEloRecord.new_elo_rating;
        eloChange = matchEloRecord.elo_change;
      } else if (teamId) {
        previousElo = matchEloRecord.old_team_elo_rating;
        eloRating = matchEloRecord.new_team_elo_rating;
        eloChange = matchEloRecord.team_elo_change;
      }
      runningStats.currentEloRating = eloRating;
    } else {
      // Fallback to calculated progression with proper initial ratings
      const totalEloChange = finalRating - initialRating;
      
      if (relevantMatches.length > 0) {
        const progressRatio = (index + 1) / relevantMatches.length;
        const smoothedProgress = Math.pow(progressRatio, 0.8);
        const expectedElo = initialRating + (totalEloChange * smoothedProgress);
        const variationFactor = isWin ? 1.1 : 0.9;
        
        if (index === relevantMatches.length - 1) {
          eloRating = finalRating;
          eloChange = finalRating - previousElo;
        } else {
          eloRating = Math.round(expectedElo * variationFactor);
          eloChange = eloRating - previousElo;
        }
        
        runningStats.currentEloRating = eloRating;
      }
    }

    trends.push({
      matchNumber: index + 1,
      date: match.created_at,
      matchLabel: matchLabel,
      winRate: (runningStats.wins / runningStats.totalMatches) * 100,
      averagePoints: runningStats.totalPoints / runningStats.totalMatches,
      pointsScored: pointsScored,
      cumulativeWins: runningStats.wins,
      cumulativeLosses: runningStats.losses,
      eloRating: eloRating,
      eloChange: eloChange,
      previousElo: previousElo,
      isWin,
      team1Name,
      team2Name,
      team1Score: match.team1_score || 0,
      team2Score: match.team2_score || 0,
      hasActualHistory: !!matchEloRecord
    });
  });

  return trends;
};

/**
 * Check if ELO history exists for a player or team
 */
export const checkEloHistoryExists = async (playerId = null, teamId = null) => {
  try {
    if (playerId) {
      const { data, error } = await supabase
        .from('player_rating_history')
        .select('id')
        .eq('player_id', playerId)
        .limit(1);
      
      if (error) return false;
      return data && data.length > 0;
    }
    
    if (teamId) {
      const { data, error } = await supabase
        .from('team_elo_history')
        .select('id')
        .eq('team_id', teamId)
        .limit(1);
      
      if (error) return false;
      return data && data.length > 0;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking ELO history:', error);
    return false;
  }
};