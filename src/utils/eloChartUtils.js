import { supabase } from '../services/supabaseService';

/**
 * Enhanced ELO chart utility that uses actual stored ELO history
 * Shows real match-by-match ups and downs, not linear progression
 */
 
/**
 * Get actual player ELO progression from stored history
 */
export const getPlayerEloProgression = async (playerId, matches, players) => {
  if (!playerId || !matches || matches.length === 0) return [];

  // Filter relevant matches for this player and sort chronologically FROM OLDEST TO NEWEST
  const relevantMatches = matches
    .filter(match => {
      if (match.status !== 'completed') return false;
      return match.team1?.team_players?.some(tp => tp.player_id === playerId) ||
             match.team2?.team_players?.some(tp => tp.player_id === playerId);
    });

  const sortedMatches = relevantMatches.sort((a, b) => {
    // Use updated_at for completed matches (when scores were recorded) for proper chronological order
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateA - dateB; // Chronological order (oldest first)
  });

  if (sortedMatches.length === 0) return [];

  console.log(`📊 Processing ${sortedMatches.length} matches for player in chronological order`);

  try {
    // Fetch actual ELO history from database
    const matchIds = sortedMatches.map(m => m.id);
    const { data: eloHistory, error } = await supabase
      .from('player_rating_history')
      .select('match_id, old_rating, new_rating, rating_change, created_at')
      .eq('player_id', playerId)
      .in('match_id', matchIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching player ELO history:', error);
      return getFallbackPlayerProgression(playerId, sortedMatches, players);
    }

    if (!eloHistory || eloHistory.length === 0) {
      console.log('No ELO history found, using fallback calculation');
      return getFallbackPlayerProgression(playerId, sortedMatches, players);
    }

    // Build progression from actual history
    const progression = [];
    let runningStats = { wins: 0, losses: 0, totalPoints: 0, totalMatches: 0 };

    sortedMatches.forEach((match, index) => {
      const isWin = didPlayerWin(match, playerId);
      
      runningStats.totalMatches++;
      if (isWin) {
        runningStats.wins++;
      } else {
        runningStats.losses++;
      }

      const pointsScored = getPointsScored(match, playerId, null);
      runningStats.totalPoints += pointsScored;

      const team1Name = match.team1?.name || 'Team 1';
      const team2Name = match.team2?.name || 'Team 2';
      const matchLabel = `${team1Name} vs ${team2Name}`;

      // Find ELO record for this match
      const eloRecord = eloHistory.find(record => record.match_id === match.id);
      
      let eloRating, eloChange, previousElo;
      
      if (eloRecord) {
        // Use actual stored ELO data
        previousElo = eloRecord.old_rating;
        eloRating = eloRecord.new_rating;
        eloChange = eloRecord.rating_change;
      } else {
        // Fallback if no history record found
        const player = players?.find(p => p.id === playerId);
        const currentRating = player?.elo_rating || 1500;
        
        // Estimate ELO for this match
        if (index === 0) {
          const skillLevel = player?.skill_level?.toLowerCase();
          previousElo = skillLevel === 'advanced' ? 1800 : 
                       skillLevel === 'beginner' ? 1200 : 1500;
        } else {
          previousElo = progression[index - 1]?.eloRating || 1500;
        }
        
        // Simple estimation
        eloChange = isWin ? 25 : -20;
        eloRating = previousElo + eloChange;
      }

      progression.push({
        matchNumber: index + 1,
        date: match.scheduled_date || match.created_at, // Use scheduled date for charts, not upload time
        matchLabel: matchLabel,
        winRate: (runningStats.wins / runningStats.totalMatches) * 100,
        avgPointsPerMatch: runningStats.totalMatches > 0 ? runningStats.totalPoints / runningStats.totalMatches : 0,
        pointsScored: pointsScored,
        cumulativeWins: runningStats.wins,
        cumulativeLosses: runningStats.losses,
        eloRating: eloRating,
        eloChange: eloChange,
        previousElo: previousElo,
        isWin: isWin,
        team1Name: team1Name,
        team2Name: team2Name,
        team1Score: match.team1_score || 0,
        team2Score: match.team2_score || 0,
        hasActualHistory: !!eloRecord
      });
    });

    console.log(`✅ Player ELO progression: ${progression.length} matches, ${eloHistory.length} with actual history`);
    return progression;

  } catch (error) {
    console.error('Error in getPlayerEloProgression:', error);
    return getFallbackPlayerProgression(playerId, sortedMatches, players);
  }
};

/**
 * Get actual team ELO progression from stored history
 */
export const getTeamEloProgression = async (teamId, matches, teams) => {
  if (!teamId || !matches || matches.length === 0) return [];

  console.log(`🔍 Getting team ELO progression for team ID: ${teamId}`);

  // Filter relevant matches for this specific team and sort chronologically
  const relevantMatches = matches
    .filter(match => {
      if (match.status !== 'completed') return false;
      return match.team1_id === teamId || match.team2_id === teamId;
    });

  const sortedMatches = relevantMatches.sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateA - dateB;
  });

  if (sortedMatches.length === 0) return [];

  try {
    // Fetch actual team ELO history from database
    const matchIds = sortedMatches.map(m => m.id);
    const { data: eloHistory, error } = await supabase
      .from('team_elo_history')
      .select('match_id, old_team_elo_rating, new_team_elo_rating, team_elo_change, created_at')
      .eq('team_id', teamId)
      .in('match_id', matchIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching team ELO history:', error);
      return getFallbackTeamProgression(teamId, sortedMatches, teams);
    }

    if (!eloHistory || eloHistory.length === 0) {
      console.log('No team ELO history found, using fallback calculation');
      return getFallbackTeamProgression(teamId, sortedMatches, teams);
    }

    // Build progression from actual history
    const progression = [];
    let runningStats = { wins: 0, losses: 0, totalPoints: 0, totalMatches: 0 };

    sortedMatches.forEach((match, index) => {
      const isWin = match.winner_team_id === teamId;
      
      runningStats.totalMatches++;
      if (isWin) {
        runningStats.wins++;
      } else {
        runningStats.losses++;
      }

      const pointsScored = getPointsScored(match, null, teamId);
      runningStats.totalPoints += pointsScored;

      const team1Name = match.team1?.name || 'Team 1';
      const team2Name = match.team2?.name || 'Team 2';
      const matchLabel = `${team1Name} vs ${team2Name}`;

      // Find ELO record for this match
      const eloRecord = eloHistory.find(record => record.match_id === match.id);
      
      let eloRating, eloChange, previousElo;
      
      if (eloRecord) {
        // Use actual stored team ELO data
        previousElo = eloRecord.old_team_elo_rating;
        eloRating = eloRecord.new_team_elo_rating;
        eloChange = eloRecord.team_elo_change;
      } else {
        // Fallback if no history record found
        if (index === 0) {
          previousElo = 1500;
        } else {
          previousElo = progression[index - 1]?.eloRating || 1500;
        }
        
        eloChange = isWin ? 24 : -20;
        eloRating = previousElo + eloChange;
      }

      progression.push({
        matchNumber: index + 1,
        date: match.scheduled_date || match.created_at, // Use scheduled date for charts, not upload time
        matchLabel: matchLabel,
        winRate: (runningStats.wins / runningStats.totalMatches) * 100,
        avgPointsPerMatch: runningStats.totalMatches > 0 ? runningStats.totalPoints / runningStats.totalMatches : 0,
        pointsScored: pointsScored,
        cumulativeWins: runningStats.wins,
        cumulativeLosses: runningStats.losses,
        eloRating: eloRating,
        eloChange: eloChange,
        previousElo: previousElo,
        isWin: isWin,
        team1Name: team1Name,
        team2Name: team2Name,
        team1Score: match.team1_score || 0,
        team2Score: match.team2_score || 0,
        hasActualHistory: !!eloRecord
      });
    });

    console.log(`✅ Team ELO progression: ${progression.length} matches, ${eloHistory.length} with actual history`);
    return progression;

  } catch (error) {
    console.error('Error in getTeamEloProgression:', error);
    return getFallbackTeamProgression(teamId, sortedMatches, teams);
  }
};

/**
 * Fallback player progression calculation (when no history is available)
 */
const getFallbackPlayerProgression = (playerId, matches, players) => {
  const progression = [];
  const runningStats = { wins: 0, losses: 0, totalPoints: 0, totalMatches: 0 };
  
  // Sort matches chronologically
  const sortedMatches = matches.sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateA - dateB;
  });

  // Get player info for proper initial ELO
  const player = players?.find(p => p.id === playerId);
  const skillLevel = player?.skill_level?.toLowerCase();
  const initialElo = skillLevel === 'advanced' ? 1800 : 
                    skillLevel === 'beginner' ? 1200 : 1500;
  
  let currentElo = initialElo;

  sortedMatches.forEach((match, index) => {
    const isWin = didPlayerWin(match, playerId);
    
    runningStats.totalMatches++;
    if (isWin) {
      runningStats.wins++;
    } else {
      runningStats.losses++;
    }

    const pointsScored = getPointsScored(match, playerId, null);
    runningStats.totalPoints += pointsScored;

    const team1Name = match.team1?.name || 'Team 1';
    const team2Name = match.team2?.name || 'Team 2';
    const matchLabel = `${team1Name} vs ${team2Name}`;

    const previousElo = currentElo;
    const eloChange = isWin ? Math.floor(Math.random() * 15) + 20 : -(Math.floor(Math.random() * 15) + 15);
    currentElo += eloChange;
    currentElo = Math.max(800, Math.min(2500, currentElo));

    progression.push({
      matchNumber: index + 1,
      date: match.scheduled_date || match.created_at, // Use scheduled date for charts, not upload time
      matchLabel: matchLabel,
      winRate: (runningStats.wins / runningStats.totalMatches) * 100,
      avgPointsPerMatch: runningStats.totalMatches > 0 ? runningStats.totalPoints / runningStats.totalMatches : 0,
      pointsScored: pointsScored,
      cumulativeWins: runningStats.wins,
      cumulativeLosses: runningStats.losses,
      eloRating: Math.round(currentElo),
      eloChange: Math.round(eloChange),
      previousElo: Math.round(previousElo),
      isWin: isWin,
      team1Name: team1Name,
      team2Name: team2Name,
      team1Score: match.team1_score || 0,
      team2Score: match.team2_score || 0,
      hasActualHistory: false
    });
  });

  return progression;
};

/**
 * Fallback team progression calculation (when no history is available)
 */
const getFallbackTeamProgression = (teamId, matches, teams) => {
  const progression = [];
  const runningStats = { wins: 0, losses: 0, totalPoints: 0, totalMatches: 0 };
  
  // Sort matches chronologically
  const sortedMatches = matches.sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at);
    const dateB = new Date(b.updated_at || b.created_at);
    return dateA - dateB;
  });

  const initialElo = 1500;
  let currentElo = initialElo;

  sortedMatches.forEach((match, index) => {
    const isWin = match.winner_team_id === teamId;
    
    runningStats.totalMatches++;
    if (isWin) {
      runningStats.wins++;
    } else {
      runningStats.losses++;
    }

    const pointsScored = getPointsScored(match, null, teamId);
    runningStats.totalPoints += pointsScored;

    const team1Name = match.team1?.name || 'Team 1';
    const team2Name = match.team2?.name || 'Team 2';
    const matchLabel = `${team1Name} vs ${team2Name}`;

    const previousElo = currentElo;
    const eloChange = isWin ? Math.floor(Math.random() * 12) + 18 : -(Math.floor(Math.random() * 12) + 12);
    currentElo += eloChange;
    currentElo = Math.max(800, Math.min(2500, currentElo));

    progression.push({
      matchNumber: index + 1,
      date: match.scheduled_date || match.created_at, // Use scheduled date for charts, not upload time
      matchLabel: matchLabel,
      winRate: (runningStats.wins / runningStats.totalMatches) * 100,
      avgPointsPerMatch: runningStats.totalMatches > 0 ? runningStats.totalPoints / runningStats.totalMatches : 0,
      pointsScored: pointsScored,
      cumulativeWins: runningStats.wins,
      cumulativeLosses: runningStats.losses,
      eloRating: Math.round(currentElo),
      eloChange: Math.round(eloChange),
      previousElo: Math.round(previousElo),
      isWin: isWin,
      team1Name: team1Name,
      team2Name: team2Name,
      team1Score: match.team1_score || 0,
      team2Score: match.team2_score || 0,
      hasActualHistory: false
    });
  });

  return progression;
};

/**
 * Helper functions
 */
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