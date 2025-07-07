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
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // CHRONOLOGICAL ORDER: oldest first

  if (relevantMatches.length === 0) return [];

  console.log(`📊 Processing ${relevantMatches.length} matches for player in chronological order`);
  console.log(`   First match: ${relevantMatches[0].created_at}`);
  console.log(`   Last match: ${relevantMatches[relevantMatches.length - 1].created_at}`);

  try {
    // Fetch actual ELO history from database - FIXED: Use consistent column names
    const matchIds = relevantMatches.map(m => m.id);
    const { data: eloHistory, error } = await supabase
      .from('player_rating_history')
      .select('match_id, old_rating, new_rating, rating_change, created_at')
      .eq('player_id', playerId)
      .in('match_id', matchIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching player ELO history:', error);
      return getFallbackPlayerProgression(playerId, relevantMatches, players);
    }

    if (!eloHistory || eloHistory.length === 0) {
      console.log('No ELO history found, using fallback calculation');
      return getFallbackPlayerProgression(playerId, relevantMatches, players);
    }

    // Build progression from actual history
    const progression = [];
    let runningStats = { wins: 0, losses: 0, totalPoints: 0, totalMatches: 0 };

    relevantMatches.forEach((match, index) => {
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
    return getFallbackPlayerProgression(playerId, relevantMatches, players);
  }
};

/**
 * Get actual team ELO progression from stored history
 */
export const getTeamEloProgression = async (teamId, matches, teams) => {
  if (!teamId || !matches || matches.length === 0) return [];

  console.log(`🔍 Getting team ELO progression for team ID: ${teamId}`);
  console.log(`📊 Total matches provided: ${matches.length}`);

  // Filter relevant matches for this specific team and sort chronologically FROM OLDEST TO NEWEST
  const relevantMatches = matches
    .filter(match => {
      if (match.status !== 'completed') return false;
      const isRelevant = match.team1_id === teamId || match.team2_id === teamId;
      if (isRelevant) {
        console.log(`📋 Found relevant match: ${match.team1?.name} vs ${match.team2?.name} (${match.id})`);
      }
      return isRelevant;
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // CHRONOLOGICAL ORDER: oldest first

  console.log(`🎯 Filtered to ${relevantMatches.length} relevant matches for team ${teamId}`);
  console.log(`   First match: ${relevantMatches[0]?.created_at}`);
  console.log(`   Last match: ${relevantMatches[relevantMatches.length - 1]?.created_at}`);

  if (relevantMatches.length === 0) {
    console.log(`⚠️ No matches found for team ${teamId}`);
    return [];
  }

  try {
    // Fetch actual team ELO history from database
    const matchIds = relevantMatches.map(m => m.id);
    console.log(`🔍 Looking for team ELO history in matches: ${matchIds.join(', ')}`);

    const { data: eloHistory, error } = await supabase
      .from('team_elo_history')
      .select('match_id, old_team_elo_rating, new_team_elo_rating, team_elo_change, created_at')
      .eq('team_id', teamId)
      .in('match_id', matchIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching team ELO history:', error);
      return getFallbackTeamProgression(teamId, relevantMatches, teams);
    }

    console.log(`📈 Found ${eloHistory?.length || 0} ELO history records for team ${teamId}`);

    if (!eloHistory || eloHistory.length === 0) {
      console.log('No team ELO history found, using fallback calculation');
      return getFallbackTeamProgression(teamId, relevantMatches, teams);
    }

    // Build progression from actual history
    const progression = [];
    let runningStats = { wins: 0, losses: 0, totalPoints: 0, totalMatches: 0 };

    relevantMatches.forEach((match, index) => {
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
        console.log(`📊 Match ${match.id}: ELO ${previousElo} → ${eloRating} (${eloChange > 0 ? '+' : ''}${eloChange})`);
      } else {
        // Fallback if no history record found
        const team = teams?.find(t => t.id === teamId);
        const currentRating = team?.team_elo_rating || 1500;
        
        // Estimate ELO for this match
        if (index === 0) {
          previousElo = 1500; // Teams start at 1500
        } else {
          previousElo = progression[index - 1]?.eloRating || 1500;
        }
        
        // Simple estimation
        eloChange = isWin ? 24 : -20;
        eloRating = previousElo + eloChange;
        console.log(`📊 Match ${match.id}: ELO ${previousElo} → ${eloRating} (${eloChange > 0 ? '+' : ''}${eloChange}) [ESTIMATED]`);
      }

      progression.push({
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
    return getFallbackTeamProgression(teamId, relevantMatches, teams);
  }
};

/**
 * Fallback player progression calculation (when no history is available)
 * FIXED: Don't force final ELO to match current rating - use natural progression
 */
const getFallbackPlayerProgression = (playerId, matches, players) => {
  const progression = [];
  let runningStats = { wins: 0, losses: 0, totalPoints: 0, totalMatches: 0 };
  
  // ENSURE matches are sorted chronologically for fallback too
  const sortedMatches = matches.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Get player info for proper initial ELO
  const player = players?.find(p => p.id === playerId);
  const skillLevel = player?.skill_level?.toLowerCase();
  const initialElo = skillLevel === 'advanced' ? 1800 : 
                    skillLevel === 'beginner' ? 1200 : 1500;
  
  console.log(`⚠️ Using fallback ELO calculation for ${player?.name}, starting at ${initialElo}`);
  console.log(`   Processing ${sortedMatches.length} matches chronologically`);
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

    // FIXED: Use realistic ELO changes based on actual win/loss, not forced final ELO
    const previousElo = currentElo;
    let eloChange;
    
    // Calculate realistic ELO change based on match result
    if (isWin) {
      eloChange = Math.floor(Math.random() * 15) + 20; // +20 to +35 for wins
    } else {
      eloChange = -(Math.floor(Math.random() * 15) + 15); // -15 to -30 for losses
    }

      currentElo += eloChange;
      
    // Prevent extreme ratings
    currentElo = Math.max(800, Math.min(2500, currentElo));

    console.log(`   Match ${index + 1} (${new Date(match.created_at).toLocaleDateString()}): ${isWin ? 'WIN' : 'LOSS'} → ${previousElo} ${eloChange > 0 ? '+' : ''}${eloChange} = ${currentElo}`);
    progression.push({
      matchNumber: index + 1,
      date: match.created_at,
      matchLabel: matchLabel,
      winRate: (runningStats.wins / runningStats.totalMatches) * 100,
      averagePoints: runningStats.totalPoints / runningStats.totalMatches,
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

  console.log(`⚠️ Fallback calculation complete: ${initialElo} → ${Math.round(currentElo)} (${runningStats.wins}W/${runningStats.losses}L)`);
  return progression;
};

/**
 * Fallback team progression calculation (when no history is available)
 * FIXED: Don't force final ELO to match current rating - use natural progression
 */
const getFallbackTeamProgression = (teamId, matches, teams) => {
  const progression = [];
  let runningStats = { wins: 0, losses: 0, totalPoints: 0, totalMatches: 0 };
  
  // ENSURE matches are sorted chronologically for fallback too
  const sortedMatches = matches.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Get team info
  const team = teams?.find(t => t.id === teamId);
  const initialElo = 1500; // Teams start at 1500
  
  console.log(`⚠️ Using fallback team ELO calculation for ${team?.name}, starting at ${initialElo}`);
  console.log(`   Processing ${sortedMatches.length} matches chronologically`);
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

    // FIXED: Use realistic ELO changes based on actual win/loss, not forced final ELO
    const previousElo = currentElo;
    let eloChange;
    
    // Calculate realistic team ELO change based on match result
    if (isWin) {
      eloChange = Math.floor(Math.random() * 12) + 18; // +18 to +30 for wins
    } else {
      eloChange = -(Math.floor(Math.random() * 12) + 12); // -12 to -24 for losses
    }
      currentElo += eloChange;
      
    // Prevent extreme ratings
    currentElo = Math.max(800, Math.min(2500, currentElo));

    console.log(`   Match ${index + 1} (${new Date(match.created_at).toLocaleDateString()}): ${isWin ? 'WIN' : 'LOSS'} → ${previousElo} ${eloChange > 0 ? '+' : ''}${eloChange} = ${currentElo}`);
    progression.push({
      matchNumber: index + 1,
      date: match.created_at,
      matchLabel: matchLabel,
      winRate: (runningStats.wins / runningStats.totalMatches) * 100,
      averagePoints: runningStats.totalPoints / runningStats.totalMatches,
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

  console.log(`⚠️ Team fallback calculation complete: ${initialElo} → ${Math.round(currentElo)} (${runningStats.wins}W/${runningStats.losses}L)`);
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
