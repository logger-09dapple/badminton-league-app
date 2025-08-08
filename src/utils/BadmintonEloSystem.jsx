// Comprehensive ELO Rating System for Badminton League with Enhanced Error Handling
import { teamEloSystem } from './TeamEloSystem';

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
      highRated: 0.6     // High-rated players change slowly
    };
  }

  /**
   * Validate player data for ELO calculation - ENHANCED for new players
   */
  validatePlayerData(players) {
    const errors = [];

    if (!Array.isArray(players)) {
      errors.push('Players must be an array');
      return { isValid: false, errors };
    }

    if (players.length === 0) {
      errors.push('At least one player is required');
      return { isValid: false, errors };
    }

    players.forEach((player, index) => {
      if (!player) {
        errors.push(`Player at index ${index} is null or undefined`);
        return;
      }

      if (!player.id) {
        errors.push(`Player at index ${index} missing ID`);
      }

      if (!player.name) {
        errors.push(`Player at index ${index} missing name`);
      }

      // ENHANCED: Be more forgiving with ELO rating validation for new players
      const eloRating = player.elo_rating;
      if (eloRating === null || eloRating === undefined) {
        console.warn(`Player ${player.name || index} has no ELO rating, will use default ${this.initialRating}`);
        player.elo_rating = this.initialRating; // Auto-fix missing ELO
      } else if (typeof eloRating !== 'number' || isNaN(eloRating)) {
        console.warn(`Player ${player.name || index} has invalid ELO rating: ${eloRating}, will use default ${this.initialRating}`);
        player.elo_rating = this.initialRating; // Auto-fix invalid ELO
      } else if (eloRating < this.minRating || eloRating > this.maxRating) {
        console.warn(`Player ${player.name || index} ELO rating ${eloRating} out of range, will clamp to valid range`);
        player.elo_rating = Math.max(this.minRating, Math.min(this.maxRating, eloRating)); // Auto-fix out of range ELO
      }

      // ENHANCED: Auto-fix missing games played
      if (!player.elo_games_played || typeof player.elo_games_played !== 'number' || isNaN(player.elo_games_played)) {
        console.warn(`Player ${player.name || index} has invalid elo_games_played, will use 0`);
        player.elo_games_played = 0;
      }

      // ENHANCED: Auto-fix missing skill level
      if (!player.skill_level) {
        console.warn(`Player ${player.name || index} has no skill level, will use 'Intermediate'`);
        player.skill_level = 'Intermediate';
      }
    });
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate match scores - FIXED for proper badminton rules
   */
  validateMatchScores(team1Score, team2Score) {
    const errors = [];

    if (typeof team1Score !== 'number' || isNaN(team1Score)) {
      errors.push('Team 1 score must be a valid number');
    }

    if (typeof team2Score !== 'number' || isNaN(team2Score)) {
      errors.push('Team 2 score must be a valid number');
    }

    if (team1Score < 0 || team2Score < 0) {
      errors.push('Scores cannot be negative');
    }

    if (team1Score > 30 || team2Score > 30) {
      errors.push('Scores cannot exceed 30 (badminton maximum)');
    }

    // FIXED: Check for valid badminton score completion
    const higher = Math.max(team1Score, team2Score);
    const lower = Math.min(team1Score, team2Score);

    // No ties allowed
    if (team1Score === team2Score) {
      errors.push('Scores cannot be tied in badminton');
    return { isValid: errors.length === 0, errors };
  }

    // Winner must have at least 21 points
    if (higher < 21) {
      errors.push('Match not complete - winner must have at least 21 points');
      return { isValid: errors.length === 0, errors };
    }

    // FIXED: At 30 points, game ends regardless of opponent's score
    if (higher === 30) {
      return { isValid: true, errors: [] }; // 30 is always a winning score
    }

    // FIXED: For scores below 30, must win by at least 2 points
    if (higher < 30 && (higher - lower) < 2) {
      errors.push('Match not complete - winner must win by at least 2 points (or reach 30 points)');
      return { isValid: errors.length === 0, errors };
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Safely get player ELO rating with fallback
   */
  getPlayerEloRating(player) {
    try {
      if (!player) return this.initialRating;

      const rating = player.elo_rating;

      if (typeof rating === 'number' && !isNaN(rating) && rating >= this.minRating && rating <= this.maxRating) {
        return rating;
      }

      console.warn(`Invalid ELO rating for player ${player.name || player.id}: ${rating}, using initial rating`);
        return this.initialRating;
    } catch (error) {
      console.error('Error getting player ELO rating:', error);
      return this.initialRating;
    }
  }
	
  /**
   * Calculate expected score with error handling
   */
  calculateExpectedScore(playerRating, opponentRating) {
    try {
      if (typeof playerRating !== 'number' || typeof opponentRating !== 'number') {
        throw new Error('Ratings must be numbers');
      }

      if (isNaN(playerRating) || isNaN(opponentRating)) {
        throw new Error('Ratings cannot be NaN');
      }

      const ratingDiff = opponentRating - playerRating;
      const expectedScore = 1 / (1 + Math.pow(10, ratingDiff / 400));

      // Ensure result is between 0 and 1
      return Math.max(0, Math.min(1, expectedScore));
    } catch (error) {
      console.error('Error calculating expected score:', error);
      return 0.5; // Fallback to 50% expected score
    }
  }
  /**
   * Get K-factor with adjustments and error handling
   */
  getKFactor(player) {
    try {
      if (!player) return this.kFactor;
    const gamesPlayed = player.elo_games_played || 0;
      const rating = this.getPlayerEloRating(player);
      let kFactor = this.kFactor;
      // Adjust K-factor based on experience
    if (gamesPlayed < 10) {
        kFactor *= this.kFactorAdjustments.provisional;
      } else if (gamesPlayed < 30) {
        kFactor *= this.kFactorAdjustments.newPlayer;
      } else if (rating > 2000) {
      kFactor *= this.kFactorAdjustments.highRated;
      } else if (gamesPlayed > 100) {
        kFactor *= this.kFactorAdjustments.experienced;
    }

      return Math.max(8, Math.min(64, kFactor)); // Clamp between 8 and 64
    } catch (error) {
      console.error('Error calculating K-factor:', error);
      return this.kFactor;
  }
}

  /**
   * Calculate new ELO rating with comprehensive error handling - FIXED to ensure integers
   */
  calculateNewRating(currentRating, expectedScore, actualScore, kFactor) {
    try {
      if (typeof currentRating !== 'number' || isNaN(currentRating)) {
        throw new Error('Current rating must be a valid number');
      }

      if (typeof expectedScore !== 'number' || isNaN(expectedScore)) {
        throw new Error('Expected score must be a valid number');
      }

      if (typeof actualScore !== 'number' || isNaN(actualScore)) {
        throw new Error('Actual score must be a valid number');
      }

      if (typeof kFactor !== 'number' || isNaN(kFactor)) {
        throw new Error('K-factor must be a valid number');
      }

      const ratingChange = kFactor * (actualScore - expectedScore);
      const newRating = currentRating + ratingChange;

      // Clamp rating within valid range and ENSURE INTEGER
      const clampedRating = Math.max(this.minRating, Math.min(this.maxRating, newRating));

      return {
        newRating: Math.round(clampedRating), // CRITICAL: Always return integer
        ratingChange: Math.round(ratingChange), // CRITICAL: Always return integer
        expectedScore: Math.round(expectedScore * 1000) / 1000, // Keep precision for calculations but not for storage
        actualScore,
        kFactor: Math.round(kFactor) // CRITICAL: Always return integer
      };
    } catch (error) {
      console.error('Error calculating new rating:', error);
      return {
        newRating: Math.round(currentRating || this.initialRating), // CRITICAL: Always return integer
        ratingChange: 0,
        expectedScore: 0.5,
        actualScore: 0.5,
        kFactor: Math.round(this.kFactor) // CRITICAL: Always return integer
      };
    }
  }

  /**
   * Determine skill level based on ELO rating
   */
  getSkillLevelFromElo(eloRating) {
    try {
      const rating = typeof eloRating === 'number' ? eloRating : this.initialRating;

      for (const [level, range] of Object.entries(this.skillThresholds)) {
        if (rating >= range.min && rating <= range.max) {
          return level;
        }
      }

      return 'Intermediate'; // Fallback
    } catch (error) {
      console.error('Error determining skill level:', error);
      return 'Intermediate';
    }
  }

  /**
   * Process match result with comprehensive error handling and validation
   * Now includes team ELO processing
   */
  processMatchResult(team1Players, team2Players, team1Score, team2Score, team1Data = null, team2Data = null) {
    try {
      console.log('🎯 Processing match result with error handling (including team ELO)');
      console.log('Team 1 players:', team1Players?.map(p => ({ id: p?.id, name: p?.name, elo_rating: p?.elo_rating })));
      console.log('Team 2 players:', team2Players?.map(p => ({ id: p?.id, name: p?.name, elo_rating: p?.elo_rating })));
      console.log('Scores:', { team1Score, team2Score });

      // Validate inputs
      const team1Validation = this.validatePlayerData(team1Players);
      if (!team1Validation.isValid) {
        console.error('❌ Team 1 validation failed:', team1Validation.errors);
        throw new Error(`Team 1 validation failed: ${team1Validation.errors.join(', ')}`);
      }

      const team2Validation = this.validatePlayerData(team2Players);
      if (!team2Validation.isValid) {
        console.error('❌ Team 2 validation failed:', team2Validation.errors);
        throw new Error(`Team 2 validation failed: ${team2Validation.errors.join(', ')}`);
      }

      const scoreValidation = this.validateMatchScores(team1Score, team2Score);
      if (!scoreValidation.isValid) {
        console.error('❌ Score validation failed:', scoreValidation.errors);
        throw new Error(`Score validation failed: ${scoreValidation.errors.join(', ')}`);
      }

      // Calculate team averages safely
      const team1AvgRating = this.calculateTeamAverageRating(team1Players);
      const team2AvgRating = this.calculateTeamAverageRating(team2Players);

      console.log('✅ Validation passed, calculating ELO changes...');
      console.log('Team averages:', { team1AvgRating, team2AvgRating });

      const team1Won = team1Score > team2Score;
      const eloUpdates = [];
      const teamEloUpdates = [];
    
      // Process each player with error handling
      const allPlayers = [...team1Players, ...team2Players];

      for (let i = 0; i < allPlayers.length; i++) {
        const player = allPlayers[i];
        try {
          if (!player || !player.id) {
            console.warn(`⚠️ Skipping invalid player at index ${i}:`, player);
            continue;
          }

          console.log(`🔄 Processing player: ${player.name} (ID: ${player.id}, ELO: ${player.elo_rating})`);

          const isTeam1 = team1Players.some(p => p.id === player.id);
          const playerWon = isTeam1 ? team1Won : !team1Won;
          const opponentAvgRating = isTeam1 ? team2AvgRating : team1AvgRating;

          const currentRating = this.getPlayerEloRating(player);
          const expectedScore = this.calculateExpectedScore(currentRating, opponentAvgRating);
          const actualScore = playerWon ? 1 : 0;
          const kFactor = this.getKFactor(player);

          const ratingResult = this.calculateNewRating(currentRating, expectedScore, actualScore, kFactor);
          const newSkillLevel = this.getSkillLevelFromElo(ratingResult.newRating);

          const update = {
          playerId: player.id,
            playerName: player.name || 'Unknown',
            oldRating: currentRating,
            newRating: ratingResult.newRating,
            ratingChange: ratingResult.ratingChange,
            oldSkillLevel: player.skill_level || this.getSkillLevelFromElo(currentRating),
            newSkillLevel: newSkillLevel,
            expectedScore: ratingResult.expectedScore,
            actualScore: ratingResult.actualScore,
            kFactor: ratingResult.kFactor,
            opponentAvgRating,
            won: playerWon
          };
          eloUpdates.push(update);
          console.log(`✅ Player ${player.name}: ${currentRating} → ${ratingResult.newRating} (${ratingResult.ratingChange > 0 ? '+' : ''}${ratingResult.ratingChange})`);

        } catch (playerError) {
          console.error(`❌ Error processing player ${player?.name || player?.id || 'unknown'}:`, playerError);
          // Add a default update to prevent system failure
          const defaultUpdate = {
            playerId: player?.id || `unknown-${i}`,
            playerName: player?.name || 'Unknown',
            oldRating: this.getPlayerEloRating(player),
            newRating: this.getPlayerEloRating(player),
            ratingChange: 0,
            oldSkillLevel: player?.skill_level || 'Intermediate',
            newSkillLevel: player?.skill_level || 'Intermediate',
            expectedScore: 0.5,
            actualScore: 0.5,
            kFactor: this.kFactor,
            opponentAvgRating: this.initialRating,
            won: false,
            error: playerError.message
      };
          eloUpdates.push(defaultUpdate);
        }
      }

      // Process team ELO if team data is provided
      if (team1Data && team2Data) {
        try {
          console.log('🏆 Processing team ELO ratings...');
          const teamUpdates = teamEloSystem.processTeamMatchResult(
            team1Data,
            team2Data,
            team1Score,
            team2Score
      );
          teamEloUpdates.push(...teamUpdates);
          console.log(`✅ Generated ${teamUpdates.length} team ELO updates`);
        } catch (teamError) {
          console.error('❌ Error processing team ELO:', teamError);
          // Continue without team ELO updates
    }
      } else {
        console.log('⚠️ Team data not provided, skipping team ELO processing');
      }
    
      console.log('🎉 ELO processing completed successfully');
      console.log(`Final result: ${eloUpdates.length} player updates, ${teamEloUpdates.length} team updates`);

      return {
        playerEloUpdates: eloUpdates,
        teamEloUpdates: teamEloUpdates
      };
    } catch (error) {
      console.error('💥 Critical error in ELO processing:', error);
      console.error('Error details:', {
        team1Players: team1Players?.map(p => ({ id: p?.id, name: p?.name, elo_rating: p?.elo_rating })),
        team2Players: team2Players?.map(p => ({ id: p?.id, name: p?.name, elo_rating: p?.elo_rating })),
        team1Score,
        team2Score
      });
      // Return empty updates to prevent system crash - this is what's causing "No ELO updates generated"
      return {
        playerEloUpdates: [],
        teamEloUpdates: []
      };
  }
}

  /**
   * Calculate team average rating with error handling - FIXED to return integers
   */
  calculateTeamAverageRating(teamPlayers) {
    try {
      if (!Array.isArray(teamPlayers) || teamPlayers.length === 0) {
        return this.initialRating;
      }

      const validRatings = teamPlayers
        .map(player => this.getPlayerEloRating(player))
        .filter(rating => typeof rating === 'number' && !isNaN(rating));

      if (validRatings.length === 0) {
        return this.initialRating;
      }

      const avgRating = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
      return Math.round(avgRating); // CRITICAL: Always return integer
    } catch (error) {
      console.error('Error calculating team average rating:', error);
      return this.initialRating;
    }
  }

  /**
   * Generate skill level recommendations with error handling
   */
  generateSkillLevelRecommendations(players) {
    try {
      if (!Array.isArray(players)) {
        console.warn('Players must be an array for recommendations');
        return [];
      }

      return players
        .filter(player => {
          try {
            return player &&
                   player.id &&
                   typeof player.elo_rating === 'number' &&
                   !isNaN(player.elo_rating) &&
                   (player.elo_games_played || 0) >= 10; // Minimum games for recommendation
          } catch (error) {
            console.warn(`Error filtering player for recommendations: ${error.message}`);
            return false;
          }
        })
        .map(player => {
          try {
            const currentSkill = player.skill_level || 'Intermediate';
            const recommendedSkill = this.getSkillLevelFromElo(player.elo_rating);

            if (currentSkill !== recommendedSkill) {
              const confidence = this.calculateRecommendationConfidence(player);

              return {
                playerId: player.id,
                playerName: player.name,
                currentSkill,
                recommendedSkill,
                eloRating: player.elo_rating,
                confidence,
                gamesPlayed: player.elo_games_played || 0
              };
            }
            return null;
          } catch (error) {
            console.warn(`Error generating recommendation for player ${player.name}: ${error.message}`);
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Error generating skill level recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate recommendation confidence
   */
  calculateRecommendationConfidence(player) {
    try {
      const gamesPlayed = player.elo_games_played || 0;
    const rating = player.elo_rating || this.initialRating;
    
      // Base confidence on games played
      let confidence = Math.min(100, (gamesPlayed / 20) * 100);
      // Adjust based on how far from threshold
      const currentSkill = player.skill_level || 'Intermediate';
      const currentThreshold = this.skillThresholds[currentSkill];
      if (currentThreshold) {
      const distanceFromThreshold = Math.min(
          Math.abs(rating - currentThreshold.min),
          Math.abs(rating - currentThreshold.max)
      );

        // Higher confidence if further from threshold boundaries
        const thresholdFactor = Math.min(100, distanceFromThreshold);
        confidence = (confidence + thresholdFactor) / 2;
    }
    
      return Math.round(Math.max(0, Math.min(100, confidence)));
    } catch (error) {
      console.error('Error calculating recommendation confidence:', error);
      return 50; // Default confidence
  }
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
}

// Create singleton instance with error handling
export const badmintonEloSystem = new BadmintonEloSystem();
