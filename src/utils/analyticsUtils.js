/**
 * Analytics utilities for comprehensive statistics and insights
 * FIXED: Now uses final ELO scores from history consistently
 */

export const analyticsUtils = {
  /**
   * Calculate performance trends over time - FIXED to use final ELO consistently
   * Uses stored ELO history when available, shows FINAL ELO after each match
   */
  calculatePerformanceTrends: (matches, playerId = null, teamId = null, players = null, teams = null) => {
    if (!matches || matches.length === 0) return [];

    const relevantMatches = matches
      .filter(match => {
        // Only include completed matches
        if (match.status !== 'completed') return false;
        
        if (playerId) {
          // Filter matches where the player participated
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

    const trends = [];
    let runningStats = {
      wins: 0,
      losses: 0,
      totalPoints: 0,
      totalMatches: 0,
      currentEloRating: null
    };

    // Initialize ELO rating based on skill level (proper initial ratings)
    let initialRating = 1500;
    let finalRating = 1500;

    if (playerId && players) {
      const player = players.find(p => p.id === playerId);
      finalRating = player?.elo_rating || 1500;

      // Set proper initial rating based on skill level
      const skillLevel = player?.skill_level?.toLowerCase();
      if (skillLevel === 'advanced') {
        initialRating = 1800;
      } else if (skillLevel === 'intermediate') {
        initialRating = 1500;
      } else if (skillLevel === 'beginner') {
        initialRating = 1200;
      }

      console.log(`Player ${player?.name} - Skill: ${skillLevel}, Initial ELO: ${initialRating}, Final ELO: ${finalRating}`);
      runningStats.currentEloRating = initialRating;
    } else if (teamId && teams) {
      const team = teams.find(t => t.id === teamId);
      finalRating = team?.team_elo_rating || 1500;
      initialRating = 1500; // Teams always start at 1500
      runningStats.currentEloRating = initialRating;
    }

    relevantMatches.forEach((match, index) => {
      const isWin = (playerId && analyticsUtils.didPlayerWin(match, playerId)) ||
                    (teamId && match.winner_team_id === teamId);
      
      runningStats.totalMatches++;
      if (isWin) {
        runningStats.wins++;
      } else {
        runningStats.losses++;
      }

      // Calculate points scored in this match
      const pointsScored = analyticsUtils.getPointsScored(match, playerId, teamId);
      runningStats.totalPoints += pointsScored;

      // Get team names for display
      const team1Name = match.team1?.name || 'Team 1';
      const team2Name = match.team2?.name || 'Team 2';
      const matchLabel = `${team1Name} vs ${team2Name}`;

      // CRITICAL FIX: Calculate realistic ELO progression showing FINAL ELO after match
      let eloRating = runningStats.currentEloRating;
      let eloChange = 0;
      let previousElo = runningStats.currentEloRating;

      if (runningStats.currentEloRating !== null) {
        // Try to get actual ELO from history first
        let actualNewElo = null;
    if (playerId) {
          // Try to find player rating history for this match
          const historyRecord = match.player_rating_history?.find(h => h.player_id === playerId);
          if (historyRecord) {
            actualNewElo = historyRecord.new_rating;
            console.log(`Found actual ELO for player ${playerId} in match ${match.id}: ${actualNewElo}`);
    }
        } else if (teamId) {
          // Try to find team ELO history for this match
          const teamHistoryRecord = match.team_elo_history?.find(h => h.team_id === teamId);
          if (teamHistoryRecord) {
            actualNewElo = teamHistoryRecord.new_team_elo_rating;
            console.log(`Found actual team ELO for team ${teamId} in match ${match.id}: ${actualNewElo}`);
    }
        }

        if (actualNewElo !== null) {
          // Use actual ELO from history - this is the FINAL ELO after the match
          eloRating = actualNewElo;
          eloChange = actualNewElo - previousElo;
        } else {
          // Fallback: Calculate realistic progression based on total change distribution
          const totalEloChange = finalRating - initialRating;
          if (relevantMatches.length > 0) {
            // Distribute ELO changes more realistically
            const progressRatio = (index + 1) / relevantMatches.length;

            // Apply a smoothing function for more realistic progression
            const smoothedProgress = Math.pow(progressRatio, 0.8); // Slightly curved progression

            // Calculate expected ELO at this point
            const expectedElo = initialRating + (totalEloChange * smoothedProgress);

            // Add some variation based on win/loss
            const variationFactor = isWin ? 1.1 : 0.9;
            const baseChange = (expectedElo - previousElo) * variationFactor;

            // Ensure we end up at the final rating on the last match
            if (index === relevantMatches.length - 1) {
              eloRating = finalRating;
              eloChange = finalRating - previousElo;
            } else {
              eloRating = Math.round(expectedElo);
              eloChange = Math.round(baseChange);

              // Ensure we don't exceed the final rating too early
              if ((totalEloChange > 0 && eloRating > finalRating) ||
                  (totalEloChange < 0 && eloRating < finalRating)) {
                eloRating = previousElo + Math.round(baseChange * 0.5);
                eloChange = Math.round(baseChange * 0.5);
              }
            }
          } else {
            eloRating = finalRating;
            eloChange = finalRating - previousElo;
          }
        }

        // Update running ELO for next iteration
        runningStats.currentEloRating = eloRating;
      }

      // Win rate calculation
      const winRate = runningStats.totalMatches > 0
        ? (runningStats.wins / runningStats.totalMatches) * 100
        : 0;

      // Average points per match
      const avgPointsPerMatch = runningStats.totalMatches > 0
        ? runningStats.totalPoints / runningStats.totalMatches
        : 0;

      trends.push({
        date: new Date(match.created_at).toLocaleDateString(),
        matchId: match.id,
        matchLabel,
        result: isWin ? 'Win' : 'Loss',
        pointsScored,
        totalMatches: runningStats.totalMatches,
        wins: runningStats.wins,
        losses: runningStats.losses,
        winRate: Math.round(winRate * 10) / 10,
        avgPointsPerMatch: Math.round(avgPointsPerMatch * 10) / 10,
        eloRating: Math.round(eloRating), // FINAL ELO after this match
        eloChange: Math.round(eloChange),
        cumulativePoints: runningStats.totalPoints
      });
    });

    return trends;
  },

  /**
   * Calculate head-to-head statistics between players or teams
   */
  calculateHeadToHead: (matches, entity1Id, entity2Id, type = 'player') => {
    const h2hMatches = matches
      .filter(match => match.status === 'completed') // Only completed matches
      .filter(match => {
        if (type === 'player') {
          const team1Players = match.team1?.team_players?.map(tp => tp.player_id) || [];
          const team2Players = match.team2?.team_players?.map(tp => tp.player_id) || [];
          
          return (team1Players.includes(entity1Id) && team2Players.includes(entity2Id)) ||
                 (team1Players.includes(entity2Id) && team2Players.includes(entity1Id));
        } else {
          return (match.team1_id === entity1Id && match.team2_id === entity2Id) ||
                 (match.team1_id === entity2Id && match.team2_id === entity1Id);
        }
      });

    let entity1Wins = 0;
    let entity2Wins = 0;
    let totalPointsEntity1 = 0;
    let totalPointsEntity2 = 0;

    h2hMatches.forEach(match => {
      if (type === 'player') {
        const entity1InTeam1 = match.team1?.team_players?.some(tp => tp.player_id === entity1Id);
        const winnerIsEntity1 = entity1InTeam1
          ? match.winner_team_id === match.team1_id
          : match.winner_team_id === match.team2_id;

        if (winnerIsEntity1) {
          entity1Wins++;
        } else {
          entity2Wins++;
        }

        // Calculate points
        if (entity1InTeam1) {
          totalPointsEntity1 += match.team1_score || 0;
          totalPointsEntity2 += match.team2_score || 0;
        } else {
          totalPointsEntity1 += match.team2_score || 0;
          totalPointsEntity2 += match.team1_score || 0;
        }
      } else {
        if (match.winner_team_id === entity1Id) {
          entity1Wins++;
        } else if (match.winner_team_id === entity2Id) {
          entity2Wins++;
        }

        totalPointsEntity1 += match.team1_id === entity1Id ? (match.team1_score || 0) : (match.team2_score || 0);
        totalPointsEntity2 += match.team1_id === entity2Id ? (match.team1_score || 0) : (match.team2_score || 0);
      }
    });

    return {
      totalMatches: h2hMatches.length,
      entity1Wins,
      entity2Wins,
      entity1WinRate: h2hMatches.length > 0 ? (entity1Wins / h2hMatches.length) * 100 : 0,
      entity2WinRate: h2hMatches.length > 0 ? (entity2Wins / h2hMatches.length) * 100 : 0,
      averagePointsEntity1: h2hMatches.length > 0 ? totalPointsEntity1 / h2hMatches.length : 0,
      averagePointsEntity2: h2hMatches.length > 0 ? totalPointsEntity2 / h2hMatches.length : 0,
      matches: h2hMatches
    };
  },

  /**
   * Analyze league progression and competitiveness
   */
  analyzeLeagueProgression: (players, teams, matches) => {
    const eloDistribution = analyticsUtils.calculateEloDistribution(players);
    const competitivenessIndex = analyticsUtils.calculateCompetitivenessIndex(matches);
    const skillLevelDistribution = analyticsUtils.calculateSkillDistribution(players);
    const teamBalanceIndex = analyticsUtils.calculateTeamBalance(teams);

    return {
      eloDistribution,
      competitivenessIndex,
      skillLevelDistribution,
      teamBalanceIndex,
      totalPlayers: players?.length || 0,
      totalTeams: teams?.length || 0,
      totalMatches: matches?.length || 0,
      completedMatches: matches?.filter(m => m.status === 'completed').length || 0
    };
  },

  /**
   * Calculate ELO rating distribution
   */
  calculateEloDistribution: (players) => {
    if (!players || players.length === 0) return {};

    const ratings = players.map(p => p.elo_rating || 1500);
    const ranges = {
      'Below 1200': ratings.filter(r => r < 1200).length,
      '1200-1399': ratings.filter(r => r >= 1200 && r < 1400).length,
      '1400-1599': ratings.filter(r => r >= 1400 && r < 1600).length,
      '1600-1799': ratings.filter(r => r >= 1600 && r < 1800).length,
      '1800-1999': ratings.filter(r => r >= 1800 && r < 2000).length,
      '2000+': ratings.filter(r => r >= 2000).length
    };

    return {
      ranges,
      average: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
      median: analyticsUtils.calculateMedian(ratings),
      standardDeviation: analyticsUtils.calculateStandardDeviation(ratings)
    };
  },

  /**
   * Calculate competitiveness index (how close matches are)
   */
  calculateCompetitivenessIndex: (matches) => {
    if (!matches || matches.length === 0) return 0;

    const completedMatches = matches.filter(m => m.status === 'completed' && m.team1_score && m.team2_score);
    if (completedMatches.length === 0) return 0;

    const scoreDifferences = completedMatches.map(m => Math.abs(m.team1_score - m.team2_score));
    const avgDifference = scoreDifferences.reduce((sum, diff) => sum + diff, 0) / scoreDifferences.length;
    
    // Lower average difference = higher competitiveness
    // Normalize to 0-100 scale (assuming max reasonable difference is 21)
    return Math.max(0, 100 - (avgDifference / 21) * 100);
  },

  /**
   * Generate exportable report data
   */
  generateReportData: (players, teams, matches) => {
    const playerStats = players?.map(player => ({
      name: player.name,
      skill_level: player.skill_level,
      elo_rating: player.elo_rating || 1500,
      matches_played: player.matches_played || 0,
      matches_won: player.matches_won || 0,
      win_rate: player.matches_played > 0 ? ((player.matches_won / player.matches_played) * 100).toFixed(1) : '0.0',
      points: player.points || 0
    })) || [];

    const teamStats = teams?.map(team => ({
      name: team.name,
      skill_combination: team.skill_combination,
      matches_played: team.matches_played || 0,
      matches_won: team.matches_won || 0,
      win_rate: team.matches_played > 0 ? ((team.matches_won / team.matches_played) * 100).toFixed(1) : '0.0',
      points: team.points || 0,
      players: team.team_players?.map(tp => tp.players?.name).join(' & ') || ''
    })) || [];

    const matchHistory = matches?.map(match => ({
      date: new Date(match.created_at).toLocaleDateString(),
      team1: match.team1?.name || 'Unknown',
      team2: match.team2?.name || 'Unknown',
      score: `${match.team1_score || 0} - ${match.team2_score || 0}`,
      winner: match.winner_team_id ?
        (match.winner_team_id === match.team1_id ? match.team1?.name : match.team2?.name) :
        'No Winner',
      status: match.status
    })) || [];

    return {
      playerStats,
      teamStats,
      matchHistory,
      summary: analyticsUtils.analyzeLeagueProgression(players, teams, matches)
    };
  },

  // Helper methods
  didPlayerWin: (match, playerId) => {
    // Enhanced win detection with better error handling
    try {
      if (!match || !playerId) return false;

      // Check if match is completed and has a winner
      if (match.status !== 'completed' || !match.winner_team_id) return false;

      // Check team1 players
    const playerInTeam1 = match.team1?.team_players?.some(tp => tp.player_id === playerId);
      if (playerInTeam1) {
        return match.winner_team_id === match.team1_id;
      }

      // Check team2 players
      const playerInTeam2 = match.team2?.team_players?.some(tp => tp.player_id === playerId);
      if (playerInTeam2) {
        return match.winner_team_id === match.team2_id;
    }

      // Player not found in either team
      return false;
    } catch (error) {
      console.warn(`Error determining if player ${playerId} won match:`, error);
      return false;
    }
  },

  getPointsScored: (match, playerId, teamId) => {
    if (playerId) {
      const playerInTeam1 = match.team1?.team_players?.some(tp => tp.player_id === playerId);
      return playerInTeam1 ? (match.team1_score || 0) : (match.team2_score || 0);
    }
    if (teamId) {
      return match.team1_id === teamId ? (match.team1_score || 0) : (match.team2_score || 0);
    }
    return 0;
  },

  calculateMedian: (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  },

  calculateStandardDeviation: (arr) => {
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length;
    const squaredDifferences = arr.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDifferences.reduce((sum, val) => sum + val, 0) / arr.length;
    return Math.sqrt(avgSquaredDiff);
  },

  calculateSkillDistribution: (players) => {
    if (!players || players.length === 0) return { beginner: 0, intermediate: 0, advanced: 0 };

    const skills = ['beginner', 'intermediate', 'advanced'];
    const distribution = {};
    
    skills.forEach(skill => {
      distribution[skill] = players.filter(p =>
        p.skill_level && p.skill_level.toLowerCase() === skill.toLowerCase()
      ).length;
    });

    // Also count players with no skill level set
    const noSkillLevel = players.filter(p => !p.skill_level || p.skill_level.trim() === '').length;
    if (noSkillLevel > 0) {
      distribution['unspecified'] = noSkillLevel;
    }

    return distribution;
  },

  calculateTeamBalance: (teams) => {
    if (!teams || teams.length === 0) return 0;

    const skillCombinations = teams.map(team => team.skill_combination).filter(Boolean);
    const uniqueCombinations = [...new Set(skillCombinations)];
    
    // Higher variety = better balance
    return skillCombinations.length > 0 ? (uniqueCombinations.length / skillCombinations.length) * 100 : 0;
  }
};

export default analyticsUtils;