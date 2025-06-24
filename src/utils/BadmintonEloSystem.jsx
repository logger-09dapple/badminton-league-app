
// Comprehensive ELO Rating System for Badminton League
export class BadmintonEloSystem {
  constructor(options = {}) {
    // ELO configuration optimized for badminton [15]
    this.kFactor = options.kFactor || 32; // Standard K-factor for competitive play [18]
    this.initialRating = options.initialRating || 1500; // FIDE standard starting rating [15]
    this.minRating = options.minRating || 800; // Minimum possible rating
    this.maxRating = options.maxRating || 2800; // Maximum theoretical rating
    
    // Skill level thresholds based on ELO ratings [21]
    this.skillThresholds = {
      'Beginner': { min: 800, max: 1399 },
      'Intermediate': { min: 1400, max: 1799 },
      'Advanced': { min: 1800, max: 2800 }
    };
    
    // K-factor adjustments based on experience and rating [17]
    this.kFactorAdjustments = {
      newPlayer: 1.5,    // New players need faster adjustment
      experienced: 0.8,   // Experienced players need stability
      provisional: 2.0,   // Provisional ratings adjust quickly
      highRated: 0.6     // High rated players change slowly
    };
  }

  // Calculate expected score using standard ELO formula [12]
  calculateExpectedScore(ratingA, ratingB) {
    try {
      const exponent = (ratingB - ratingA) / 400;
      return 1 / (1 + Math.pow(10, exponent));
    } catch (error) {
      console.error('Error calculating expected score:', error);
      return 0.5; // Default to 50-50 if error occurs
    }
  }

  // Calculate new ELO rating after a match [12]
  calculateNewRating(currentRating, opponentRating, actualScore, kFactor = null) {
    try {
      const k = kFactor || this.kFactor;
      const expectedScore = this.calculateExpectedScore(currentRating, opponentRating);
      const ratingChange = k * (actualScore - expectedScore);
      const newRating = Math.round(currentRating + ratingChange);
      
      // Ensure rating stays within bounds
      return {
        newRating: Math.max(this.minRating, Math.min(this.maxRating, newRating)),
        ratingChange: Math.round(ratingChange),
        expectedScore: expectedScore
      };
    } catch (error) {
      console.error('Error calculating new rating:', error);
      return {
        newRating: currentRating,
        ratingChange: 0,
        expectedScore: 0.5
      };
    }
  }

// Enhanced processMatchResult with validation
processMatchResult(team1Players, team2Players, team1Score, team2Score) {
  try {
    console.log('Processing match result with players:', {
      team1Count: team1Players?.length || 0,
      team2Count: team2Players?.length || 0,
      team1Players: team1Players?.map(p => ({ id: p?.id, name: p?.name, elo: p?.elo_rating })),
      team2Players: team2Players?.map(p => ({ id: p?.id, name: p?.name, elo: p?.elo_rating }))
    });

    // Validate input parameters
    if (!Array.isArray(team1Players) || !Array.isArray(team2Players)) {
      throw new Error('Player arrays are invalid');
    }

    if (team1Players.length !== 2 || team2Players.length !== 2) {
      throw new Error(`Invalid team sizes: Team1 has ${team1Players.length}, Team2 has ${team2Players.length}. Expected 2 each.`);
    }

    // Validate each player has required properties
    const validatePlayer = (player, teamName, index) => {
      if (!player) {
        throw new Error(`${teamName} player ${index + 1} is null/undefined`);
      }
      if (!player.id) {
        throw new Error(`${teamName} player ${index + 1} missing ID`);
      }
      if (!player.name) {
        throw new Error(`${teamName} player ${index + 1} missing name`);
      }
      // Ensure ELO properties exist
      player.elo_rating = player.elo_rating || this.initialRating;
      player.elo_games_played = player.elo_games_played || 0;
      player.peak_elo_rating = player.peak_elo_rating || player.elo_rating;
      
      return player;
    };

    // Validate and normalize all players
    const validatedTeam1 = team1Players.map((player, index) => 
      validatePlayer(player, 'Team1', index)
    );
    
    const validatedTeam2 = team2Players.map((player, index) => 
      validatePlayer(player, 'Team2', index)
    );

    const updates = [];
    const team1Result = team1Score > team2Score ? 1 : 0;
    const team2Result = 1 - team1Result;

    // Calculate average team ratings
    const team1AvgRating = this.calculateTeamAverageRating(validatedTeam1);
    const team2AvgRating = this.calculateTeamAverageRating(validatedTeam2);

    console.log('Team average ratings:', { team1AvgRating, team2AvgRating });

    // Process each player in team 1
    validatedTeam1.forEach(player => {
      const kFactor = this.calculateAdjustedKFactor(player);
      const result = this.calculateNewRating(
        player.elo_rating, 
        team2AvgRating, 
        team1Result, 
        kFactor
      );
      
      updates.push({
        playerId: player.id,
        oldRating: player.elo_rating,
        newRating: result.newRating,
        ratingChange: result.ratingChange,
        oldSkillLevel: player.skill_level,
        newSkillLevel: this.determineSkillLevel(result.newRating),
        opponentAvgRating: team2AvgRating,
        kFactor: kFactor,
        expectedScore: result.expectedScore,
        oldPeakRating: player.peak_elo_rating,
        oldGamesPlayed: player.elo_games_played
      });
    });

    // Process each player in team 2
    validatedTeam2.forEach(player => {
      const kFactor = this.calculateAdjustedKFactor(player);
      const result = this.calculateNewRating(
        player.elo_rating, 
        team1AvgRating, 
        team2Result, 
        kFactor
      );
      
      updates.push({
        playerId: player.id,
        oldRating: player.elo_rating,
        newRating: result.newRating,
        ratingChange: result.ratingChange,
        oldSkillLevel: player.skill_level,
        newSkillLevel: this.determineSkillLevel(result.newRating),
        opponentAvgRating: team1AvgRating,
        kFactor: kFactor,
        expectedScore: result.expectedScore,
        oldPeakRating: player.peak_elo_rating,
        oldGamesPlayed: player.elo_games_played
      });
    });

    console.log('Generated ELO updates:', updates);
    return updates;
  } catch (error) {
    console.error('Error processing match result:', error);
    return [];
  }
}
	
  // Calculate team average rating for doubles [20]
  calculateTeamAverageRating(players) {
    if (!players || players.length === 0) return this.initialRating;
    
    const totalRating = players.reduce((sum, player) => 
      sum + (player.elo_rating || this.initialRating), 0
    );
    return Math.round(totalRating / players.length);
  }

  // Determine skill level based on ELO rating [21]
  determineSkillLevel(rating) {
    for (const [level, threshold] of Object.entries(this.skillThresholds)) {
      if (rating >= threshold.min && rating <= threshold.max) {
        return level;
      }
    }
    return 'Intermediate'; // Default fallback
  }

  // Calculate adjusted K-factor based on player experience [17][18]
  calculateAdjustedKFactor(player) {
    let kFactor = this.kFactor;
    const currentRating = player.elo_rating || this.initialRating;
    const gamesPlayed = player.elo_games_played || 0;

    // Adjust based on experience [17]
    if (gamesPlayed < 10) {
      kFactor *= this.kFactorAdjustments.newPlayer;
    } else if (gamesPlayed > 50) {
      kFactor *= this.kFactorAdjustments.experienced;
    }

    // Adjust based on rating level [18]
    if (currentRating > 2000) {
      kFactor *= this.kFactorAdjustments.highRated;
    } else if (gamesPlayed < 20) {
      kFactor *= this.kFactorAdjustments.provisional;
    }

    return Math.max(16, Math.min(64, Math.round(kFactor)));
  }

  // Generate skill level recommendations based on ELO ratings
  generateSkillLevelRecommendations(players) {
    const recommendations = [];
    
    players.forEach(player => {
      const currentSkill = player.skill_level;
      const recommendedSkill = this.determineSkillLevel(player.elo_rating || this.initialRating);
      
      if (currentSkill !== recommendedSkill) {
        recommendations.push({
          playerId: player.id,
          playerName: player.name,
          currentSkill: currentSkill,
          recommendedSkill: recommendedSkill,
          eloRating: player.elo_rating || this.initialRating,
          confidence: this.calculateRecommendationConfidence(player)
        });
      }
    });
    
    return recommendations;
  }

  // Calculate confidence level for skill recommendations
  calculateRecommendationConfidence(player) {
    const gamesPlayed = player.elo_games_played || 0;
    const rating = player.elo_rating || this.initialRating;
    
    // More games = higher confidence
    let confidence = Math.min(100, gamesPlayed * 5);
    
    // Ratings far from thresholds = higher confidence
    const skillThreshold = this.skillThresholds[player.skill_level];
    if (skillThreshold) {
      const distanceFromThreshold = Math.min(
        Math.abs(rating - skillThreshold.min),
        Math.abs(rating - skillThreshold.max)
      );
      confidence += Math.min(30, distanceFromThreshold / 10);
    }
    
    return Math.min(100, Math.round(confidence));
  }
}

// Export configured instance for badminton
export const badmintonEloSystem = new BadmintonEloSystem({
  kFactor: 32,
  initialRating: 1500,
  minRating: 800,
  maxRating: 2800
});
