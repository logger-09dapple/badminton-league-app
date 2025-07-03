/**
 * Analytics utilities for comprehensive statistics and insights
 */

export const analyticsUtils = {
  /**
   * Calculate performance trends over time - Enhanced for completed matches only with proper ELO tracking
   */
  calculatePerformanceTrends: (matches, playerId = null, teamId = null, players = null) => {
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

    // Get initial ELO rating
    if (playerId && players) {
      const player = players.find(p => p.id === playerId);
      runningStats.currentEloRating = player?.elo_rating || 1500;
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

      // Calculate ELO change if tracking a player
      let eloChange = 0;
      let previousElo = runningStats.currentEloRating;
      
      if (playerId && runningStats.currentEloRating !== null) {
        // Simple ELO calculation - this should ideally come from stored match data
        // But we'll calculate it based on the match outcome for now
        const K = 32; // ELO K-factor
        const opponentElo = 1500; // Default opponent ELO - this could be improved
        
        const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - runningStats.currentEloRating) / 400));
        const actualScore = isWin ? 1 : 0;
        
        eloChange = Math.round(K * (actualScore - expectedScore));
        runningStats.currentEloRating += eloChange;
        
        // Ensure ELO doesn't go below reasonable bounds
        runningStats.currentEloRating = Math.max(800, Math.min(2800, runningStats.currentEloRating));
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
        eloRating: runningStats.currentEloRating,
        eloChange: eloChange,
        previousElo: previousElo,
        isWin,
        team1Name,
        team2Name,
        team1Score: match.team1_score || 0,
        team2Score: match.team2_score || 0
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
    const playerInTeam1 = match.team1?.team_players?.some(tp => tp.player_id === playerId);
    return playerInTeam1 ? match.winner_team_id === match.team1_id : match.winner_team_id === match.team2_id;
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