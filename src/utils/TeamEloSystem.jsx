// Comprehensive Team ELO Rating System for Badminton League
export class TeamEloSystem {
  constructor(options = {}) {
    // Team ELO configuration
    this.kFactor = options.kFactor || 24; // Slightly lower than individual player K-factor
    this.initialRating = options.initialRating || 1500; // FIDE standard starting rating
    this.minRating = options.minRating || 800; // Minimum possible rating
    this.maxRating = options.maxRating || 2800; // Maximum theoretical rating
    
    // Team experience adjustments
    this.kFactorAdjustments = {
      newTeam: 1.5,        // New teams need faster adjustment
      experienced: 0.8,     // Experienced teams need stability
      provisional: 2.0,     // Provisional ratings adjust quickly
      highRated: 0.6       // High-rated teams change slowly
    };
  }

  /**
   * Validate team data for ELO calculation
   */
  validateTeamData(teams) {
    const errors = [];

    if (!Array.isArray(teams)) {
      errors.push('Teams must be an array');
      return { isValid: false, errors };
    }

    if (teams.length === 0) {
      errors.push('At least one team is required');
      return { isValid: false, errors };
    }

    teams.forEach((team, index) => {
      if (!team) {
        errors.push(`Team at index ${index} is null or undefined`);
        return;
      }

      if (!team.id) {
        errors.push(`Team at index ${index} missing ID`);
      }

      if (!team.name) {
        errors.push(`Team at index ${index} missing name`);
      }

      if (typeof team.team_elo_rating !== 'number' || isNaN(team.team_elo_rating)) {
        if (!team.team_elo_rating) {
          // Allow null/undefined for new teams
          return;
        }
        errors.push(`Team ${team.name || index} has invalid team ELO rating`);
      }

      if (team.team_elo_rating && (team.team_elo_rating < this.minRating || team.team_elo_rating > this.maxRating)) {
        errors.push(`Team ${team.name || index} team ELO rating out of valid range`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Safely get team ELO rating with fallback
   */
  getTeamEloRating(team) {
    try {
      if (!team) return this.initialRating;

      const rating = team.team_elo_rating;

      if (typeof rating === 'number' && !isNaN(rating) && rating >= this.minRating && rating <= this.maxRating) {
        return rating;
      }

      // If no team ELO exists, calculate from player ELOs as starting point
      if (team.team_players && team.team_players.length > 0) {
        const playerElos = team.team_players
          .map(tp => tp.players?.elo_rating || this.initialRating)
          .filter(elo => typeof elo === 'number' && !isNaN(elo));

        if (playerElos.length > 0) {
          const avgPlayerElo = Math.round(playerElos.reduce((sum, elo) => sum + elo, 0) / playerElos.length);
          console.log(`Initializing team ${team.name} ELO from player average: ${avgPlayerElo}`);
          return avgPlayerElo;
        }
      }

      console.warn(`Invalid team ELO rating for team ${team.name || team.id}: ${rating}, using initial rating`);
      return this.initialRating;
    } catch (error) {
      console.error('Error getting team ELO rating:', error);
      return this.initialRating;
    }
  }

  /**
   * Calculate expected score with error handling
   */
  calculateExpectedScore(teamRating, opponentRating) {
    try {
      if (typeof teamRating !== 'number' || typeof opponentRating !== 'number') {
        throw new Error('Ratings must be numbers');
      }

      if (isNaN(teamRating) || isNaN(opponentRating)) {
        throw new Error('Ratings cannot be NaN');
      }

      const ratingDiff = opponentRating - teamRating;
      const expectedScore = 1 / (1 + Math.pow(10, ratingDiff / 400));

      // Ensure result is between 0 and 1
      return Math.max(0, Math.min(1, expectedScore));
    } catch (error) {
      console.error('Error calculating expected score:', error);
      return 0.5; // Fallback to 50% expected score
    }
  }

  /**
   * Get K-factor with adjustments based on team experience
   */
  getKFactor(team) {
    try {
      if (!team) return this.kFactor;

      const gamesPlayed = team.matches_played || 0;
      const rating = this.getTeamEloRating(team);

      let kFactor = this.kFactor;

      // Adjust based on experience
      if (gamesPlayed < 5) {
        kFactor *= this.kFactorAdjustments.provisional;
      } else if (gamesPlayed < 15) {
        kFactor *= this.kFactorAdjustments.newTeam;
      } else if (rating > 1800) {
        kFactor *= this.kFactorAdjustments.highRated;
      } else if (gamesPlayed > 50) {
        kFactor *= this.kFactorAdjustments.experienced;
      }

      return Math.max(8, Math.min(48, kFactor)); // Clamp between 8 and 48
    } catch (error) {
      console.error('Error calculating K-factor:', error);
      return this.kFactor;
    }
  }

  /**
   * Calculate new team ELO rating with comprehensive error handling
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
        expectedScore: Math.round(expectedScore * 1000) / 1000, // Keep precision for calculations
        actualScore,
        kFactor: Math.round(kFactor) // CRITICAL: Always return integer
      };
    } catch (error) {
      console.error('Error calculating new team rating:', error);
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
   * Process match result for teams with comprehensive error handling
   */
  processTeamMatchResult(team1, team2, team1Score, team2Score) {
    try {
      console.log('Processing team match result with error handling');

      // Validate inputs
      const teamValidation = this.validateTeamData([team1, team2]);
      if (!teamValidation.isValid) {
        throw new Error(`Team validation failed: ${teamValidation.errors.join(', ')}`);
      }

      // Validate scores (reuse from player system)
      if (typeof team1Score !== 'number' || typeof team2Score !== 'number') {
        throw new Error('Scores must be valid numbers');
      }

      if (team1Score < 0 || team2Score < 0) {
        throw new Error('Scores cannot be negative');
      }

      // Get current team ratings
      const team1Rating = this.getTeamEloRating(team1);
      const team2Rating = this.getTeamEloRating(team2);

      const team1Won = team1Score > team2Score;
      const eloUpdates = [];

      // Calculate ELO changes for both teams
      const teams = [
        { team: team1, isWinner: team1Won, opponentRating: team2Rating },
        { team: team2, isWinner: !team1Won, opponentRating: team1Rating }
      ];

      teams.forEach(({ team, isWinner, opponentRating }) => {
        try {
          const currentRating = this.getTeamEloRating(team);
          const expectedScore = this.calculateExpectedScore(currentRating, opponentRating);
          const actualScore = isWinner ? 1 : 0;
          const kFactor = this.getKFactor(team);

          const ratingResult = this.calculateNewRating(currentRating, expectedScore, actualScore, kFactor);

          eloUpdates.push({
            teamId: team.id,
            teamName: team.name || 'Unknown',
            oldRating: currentRating,
            newRating: ratingResult.newRating,
            ratingChange: ratingResult.ratingChange,
            expectedScore: ratingResult.expectedScore,
            actualScore: ratingResult.actualScore,
            kFactor: ratingResult.kFactor,
            opponentRating,
            won: isWinner
          });
        } catch (teamError) {
          console.error(`Error processing team ${team?.name || team?.id || 'unknown'}:`, teamError);
          // Add a default update to prevent system failure
          eloUpdates.push({
            teamId: team?.id || 'unknown',
            teamName: team?.name || 'Unknown',
            oldRating: this.getTeamEloRating(team),
            newRating: this.getTeamEloRating(team),
            ratingChange: 0,
            expectedScore: 0.5,
            actualScore: 0.5,
            kFactor: this.kFactor,
            opponentRating: this.initialRating,
            won: false,
            error: teamError.message
          });
        }
      });

      console.log('Team ELO processing completed successfully');
      return eloUpdates;

    } catch (error) {
      console.error('Critical error in team ELO processing:', error);
      // Return empty updates to prevent system crash
      return [];
    }
  }

  /**
   * Generate team skill level recommendations based on ELO
   */
  generateTeamSkillRecommendations(teams) {
    try {
      if (!Array.isArray(teams)) {
        console.warn('Teams must be an array for recommendations');
        return [];
      }

      return teams
        .filter(team => {
          try {
            return team &&
                   team.id &&
                   typeof team.team_elo_rating === 'number' &&
                   !isNaN(team.team_elo_rating) &&
                   (team.matches_played || 0) >= 5; // Minimum games for team recommendation
          } catch (error) {
            console.warn(`Error filtering team for recommendations: ${error.message}`);
            return false;
          }
        })
        .map(team => {
          try {
            const currentSkill = team.skill_combination || 'Mixed';
            const recommendedSkill = this.getTeamSkillFromElo(team.team_elo_rating);

            if (currentSkill !== recommendedSkill) {
              const confidence = this.calculateTeamRecommendationConfidence(team);

              return {
                teamId: team.id,
                teamName: team.name,
                currentSkill,
                recommendedSkill,
                teamEloRating: team.team_elo_rating,
                confidence,
                gamesPlayed: team.matches_played || 0
              };
            }
            return null;
          } catch (error) {
            console.warn(`Error generating recommendation for team ${team.name}: ${error.message}`);
            return null;
          }
        })
        .filter(Boolean);
    } catch (error) {
      console.error('Error generating team skill level recommendations:', error);
      return [];
    }
  }

  /**
   * Determine team skill level based on ELO rating
   */
  getTeamSkillFromElo(eloRating) {
    try {
      const rating = typeof eloRating === 'number' ? eloRating : this.initialRating;

      if (rating >= 1800) return 'Elite';
      if (rating >= 1600) return 'Advanced';
      if (rating >= 1400) return 'Intermediate';
      if (rating >= 1200) return 'Developing';
      return 'Beginner';
    } catch (error) {
      console.error('Error determining team skill level:', error);
      return 'Intermediate';
    }
  }

  /**
   * Calculate team recommendation confidence
   */
  calculateTeamRecommendationConfidence(team) {
    try {
      const gamesPlayed = team.matches_played || 0;
      const rating = team.team_elo_rating || this.initialRating;

      // Base confidence on games played
      let confidence = Math.min(100, (gamesPlayed / 10) * 100);

      // Adjust based on rating stability (teams with more extreme ratings need more games)
      const ratingDistance = Math.abs(rating - this.initialRating);
      const stabilityFactor = Math.min(100, (gamesPlayed / Math.max(1, ratingDistance / 100)) * 100);
      
      confidence = (confidence + stabilityFactor) / 2;

      return Math.round(Math.max(0, Math.min(100, confidence)));
    } catch (error) {
      console.error('Error calculating team recommendation confidence:', error);
      return 50; // Default confidence
    }
  }
}

// Create singleton instance
export const teamEloSystem = new TeamEloSystem();