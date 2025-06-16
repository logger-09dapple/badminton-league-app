
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

  // Process match results for all players in doubles match [20]
  processMatchResult(team1Players, team2Players, team1Score, team2Score) {
    try {
      const updates = [];
      const team1Result = team1Score > team2Score ? 1 : 0;
      const team2Result = 1 - team1Result;

      // Calculate average team ratings for opponent strength assessment [20]
      const team1AvgRating = this.calculateTeamAverageRating(team1Players);
      const team2AvgRating = this.calculateTeamAverageRating(team2Players);

      // Process each player in team 1
      team1Players.forEach(player => {
        const kFactor = this.calculateAdjustedKFactor(player);
        const result = this.calculateNewRating(
          player.elo_rating || this.initialRating, 
          team2AvgRating, 
          team1Result, 
          kFactor
        );
        
        updates.push({
          playerId: player.id,
          oldRating: player.elo_rating || this.initialRating,
          newRating: result.newRating,
          ratingChange: result.ratingChange,
          oldSkillLevel: player.skill_level,
          newSkillLevel: this.determineSkillLevel(result.newRating),
          opponentAvgRating: team2AvgRating,
          kFactor: kFactor,
          expectedScore: result.expectedScore
        });
      });

      // Process each player in team 2
      team2Players.forEach(player => {
        const kFactor = this.calculateAdjustedKFactor(player);
        const result = this.calculateNewRating(
          player.elo_rating || this.initialRating, 
          team1AvgRating, 
          team2Result, 
          kFactor
        );
        
        updates.push({
          playerId: player.id,
          oldRating: player.elo_rating || this.initialRating,
          newRating: result.newRating,
          ratingChange: result.ratingChange,
          oldSkillLevel: player.skill_level,
          newSkillLevel: this.determineSkillLevel(result.newRating),
          opponentAvgRating: team1AvgRating,
          kFactor: kFactor,
          expectedScore: result.expectedScore
        });
      });

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
