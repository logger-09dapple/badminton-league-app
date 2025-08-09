// FIFA World Football ELO-inspired system with logarithmic margin scaling
// Based on the official World Football Elo system used for national team rankings
import { BadmintonEloSystem } from './BadmintonEloSystem';

export class FootballEloScalingSystem extends BadmintonEloSystem {
  constructor(options = {}) {
    super(options);
    
    // FIFA World Football Elo scaling parameters (adapted for badminton)
    this.marginScaling = {
      // Logarithmic base - controls how quickly margins diminish in impact
      logBase: Math.E, // Natural log (like FIFA system)
      
      // Scaling factor - how much margin affects the multiplier
      scaleFactor: 0.15, // Tuned for badminton point ranges (0-30)
      
      // Minimum multiplier (even decisive wins shouldn't be too extreme)
      minMultiplier: 1.0,
      
      // Maximum multiplier (caps extreme margins)
      maxMultiplier: 1.75,
      
      // Baseline margin (margins below this have minimal impact)
      baselineMargin: 2
    };
    
    // Match importance factors (like FIFA's competition weighting)
    this.matchImportance = {
      practice: 0.8,      // Casual/practice matches
      league: 1.0,        // Regular league matches  
      tournament: 1.2,    // Tournament matches
      championship: 1.4   // Championship/final matches
    };
  }

  /**
   * Calculate FIFA-style logarithmic margin multiplier
   * Formula: 1 + scaleFactor * ln(1 + max(0, margin - baseline))
   */
  calculateMarginMultiplier(winnerScore, loserScore) {
    try {
      // Calculate raw margin
      const rawMargin = Math.abs(winnerScore - loserScore);
      
      // Apply baseline threshold (small margins have minimal impact)
      const effectiveMargin = Math.max(0, rawMargin - this.marginScaling.baselineMargin);
      
      // Calculate logarithmic multiplier
      // ln(1 + x) ensures smooth scaling from 0 and avoids log(0)
      const logComponent = Math.log(1 + effectiveMargin);
      const multiplier = 1 + (this.marginScaling.scaleFactor * logComponent);
      
      // Clamp to reasonable bounds
      const clampedMultiplier = Math.max(
        this.marginScaling.minMultiplier,
        Math.min(this.marginScaling.maxMultiplier, multiplier)
      );
      
      console.log(`📊 Margin Analysis: ${winnerScore}-${loserScore}`);
      console.log(`  Raw Margin: ${rawMargin}`);
      console.log(`  Effective Margin: ${effectiveMargin}`);
      console.log(`  Log Component: ${logComponent.toFixed(3)}`);
      console.log(`  Final Multiplier: ${clampedMultiplier.toFixed(3)}x`);
      
      return clampedMultiplier;
      
    } catch (error) {
      console.error('Error calculating margin multiplier:', error);
      return 1.0; // Fallback to standard multiplier
    }
  }

  /**
   * Calculate opponent strength factor (like FIFA's team strength consideration)
   * Stronger opponents beaten = bigger reward, weaker opponents beaten = smaller reward
   */
  calculateOpponentStrengthFactor(playerRating, opponentRating) {
    try {
      // Rating difference threshold
      const ratingDiff = opponentRating - playerRating;
      
      // Logarithmic adjustment based on opponent strength
      // Positive diff = stronger opponent, negative = weaker opponent
      let strengthFactor = 1.0;
      
      if (ratingDiff > 0) {
        // Beating stronger opponent - bonus reward
        strengthFactor = 1.0 + (0.1 * Math.log(1 + ratingDiff / 100));
      } else if (ratingDiff < 0) {
        // Beating weaker opponent - reduced reward
        strengthFactor = 1.0 - (0.05 * Math.log(1 + Math.abs(ratingDiff) / 100));
      }
      
      // Clamp between reasonable bounds
      return Math.max(0.7, Math.min(1.3, strengthFactor));
      
    } catch (error) {
      console.error('Error calculating opponent strength factor:', error);
      return 1.0;
    }
  }

  /**
   * Enhanced K-factor calculation with FIFA-inspired factors
   */
  getEnhancedKFactor(player, marginMultiplier, opponentStrengthFactor, matchImportance = 'league') {
    try {
      // Base K-factor from parent class
      const baseKFactor = this.getKFactor(player);
      
      // Apply all multipliers
      const importanceMultiplier = this.matchImportance[matchImportance] || 1.0;
      
      const enhancedKFactor = baseKFactor * 
                             marginMultiplier * 
                             opponentStrengthFactor * 
                             importanceMultiplier;
      
      // Ensure reasonable bounds (prevent extreme rating swings)
      return Math.max(8, Math.min(80, Math.round(enhancedKFactor)));
      
    } catch (error) {
      console.error('Error calculating enhanced K-factor:', error);
      return this.getKFactor(player);
    }
  }

  /**
   * Process match result with FIFA World Football Elo scaling
   */
  processFootballEloMatchResult(team1Players, team2Players, team1Score, team2Score, matchImportance = 'league', team1Data = null, team2Data = null) {
    try {
      console.log('🌍 Processing match with FIFA World Football Elo scaling');
      console.log(`Match: ${team1Score}-${team2Score}, Importance: ${matchImportance}`);
      
      // Standard validation
      const team1Validation = this.validatePlayerData(team1Players);
      const team2Validation = this.validatePlayerData(team2Players);
      const scoreValidation = this.validateMatchScores(team1Score, team2Score);
      
      if (!team1Validation.isValid) {
        throw new Error(`Team 1 validation failed: ${team1Validation.errors.join(', ')}`);
      }
      if (!team2Validation.isValid) {
        throw new Error(`Team 2 validation failed: ${team2Validation.errors.join(', ')}`);
      }
      if (!scoreValidation.isValid) {
        throw new Error(`Score validation failed: ${scoreValidation.errors.join(', ')}`);
      }

      // Calculate team averages
      const team1AvgRating = this.calculateTeamAverageRating(team1Players);
      const team2AvgRating = this.calculateTeamAverageRating(team2Players);
      
      // Determine winner and calculate margin multiplier
      const team1Won = team1Score > team2Score;
      const winnerScore = team1Won ? team1Score : team2Score;
      const loserScore = team1Won ? team2Score : team1Score;
      const marginMultiplier = this.calculateMarginMultiplier(winnerScore, loserScore);
      
      console.log(`Team averages: Team1=${team1AvgRating}, Team2=${team2AvgRating}`);
      console.log(`Winner: Team${team1Won ? '1' : '2'}, Margin Multiplier: ${marginMultiplier.toFixed(3)}x`);

      const eloUpdates = [];
      const teamEloUpdates = [];
      
      // Process each player
      const allPlayers = [...team1Players, ...team2Players];
      
      for (const player of allPlayers) {
        try {
          if (!player?.id) {
            console.warn('⚠️ Skipping invalid player:', player);
            continue;
          }

          console.log(`🔄 Processing: ${player.name} (ELO: ${player.elo_rating})`);

          const isTeam1 = team1Players.some(p => p.id === player.id);
          const playerWon = isTeam1 ? team1Won : !team1Won;
          const opponentAvgRating = isTeam1 ? team2AvgRating : team1AvgRating;
          
          const currentRating = this.getPlayerEloRating(player);
          const expectedScore = this.calculateExpectedScore(currentRating, opponentAvgRating);
          
          // Calculate opponent strength factor
          const opponentStrengthFactor = this.calculateOpponentStrengthFactor(currentRating, opponentAvgRating);
          
          // Calculate enhanced K-factor with all FIFA-inspired factors
          const enhancedKFactor = this.getEnhancedKFactor(
            player, 
            playerWon ? marginMultiplier : 1.0, // Only winners get margin bonus
            opponentStrengthFactor,
            matchImportance
          );
          
          // Use standard binary outcome (0 or 1) but with enhanced K-factor
          // This is closer to FIFA's approach than changing the actual score
          const actualScore = playerWon ? 1 : 0;
          
          const ratingResult = this.calculateNewRating(currentRating, expectedScore, actualScore, enhancedKFactor);
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
            actualScore: actualScore,
            kFactor: enhancedKFactor,
            baseKFactor: this.getKFactor(player),
            marginMultiplier: playerWon ? marginMultiplier : 1.0,
            opponentStrengthFactor: opponentStrengthFactor,
            matchImportanceMultiplier: this.matchImportance[matchImportance] || 1.0,
            opponentAvgRating,
            won: playerWon,
            scoreMargin: Math.abs(team1Score - team2Score),
            matchImportance: matchImportance
          };

          eloUpdates.push(update);

          console.log(`✅ ${player.name}: ${currentRating} → ${ratingResult.newRating} (${ratingResult.ratingChange > 0 ? '+' : ''}${ratingResult.ratingChange})`);
          console.log(`   K-Factor: ${this.getKFactor(player)} → ${enhancedKFactor} (${(enhancedKFactor / this.getKFactor(player)).toFixed(2)}x)`);
          console.log(`   Factors: Margin=${marginMultiplier.toFixed(2)}x, Opponent=${opponentStrengthFactor.toFixed(2)}x, Importance=${this.matchImportance[matchImportance]}x`);

        } catch (playerError) {
          console.error(`❌ Error processing player ${player?.name}:`, playerError);
          
          // Add default update to prevent system failure
          const defaultUpdate = {
            playerId: player?.id || 'unknown',
            playerName: player?.name || 'Unknown',
            oldRating: this.getPlayerEloRating(player),
            newRating: this.getPlayerEloRating(player),
            ratingChange: 0,
            oldSkillLevel: player?.skill_level || 'Intermediate',
            newSkillLevel: player?.skill_level || 'Intermediate',
            expectedScore: 0.5,
            actualScore: 0.5,
            kFactor: this.kFactor,
            baseKFactor: this.kFactor,
            marginMultiplier: 1.0,
            opponentStrengthFactor: 1.0,
            matchImportanceMultiplier: 1.0,
            opponentAvgRating: this.initialRating,
            won: false,
            scoreMargin: 0,
            matchImportance: matchImportance,
            error: playerError.message
          };
          eloUpdates.push(defaultUpdate);
        }
      }

      // Process team ELO with same enhancements
      if (team1Data && team2Data) {
        try {
          console.log('🏆 Processing enhanced team ELO...');
          
          // Apply similar logic to team ratings
          const team1Rating = team1Data.team_elo_rating || this.initialRating;
          const team2Rating = team2Data.team_elo_rating || this.initialRating;
          
          // Team 1 update
          const team1ExpectedScore = this.calculateExpectedScore(team1Rating, team2Rating);
          const team1ActualScore = team1Won ? 1 : 0;
          const team1OpponentStrength = this.calculateOpponentStrengthFactor(team1Rating, team2Rating);
          const team1KFactor = 24 * (team1Won ? marginMultiplier : 1.0) * team1OpponentStrength * (this.matchImportance[matchImportance] || 1.0);
          const team1Result = this.calculateNewRating(team1Rating, team1ExpectedScore, team1ActualScore, team1KFactor);
          
          // Team 2 update  
          const team2ExpectedScore = this.calculateExpectedScore(team2Rating, team1Rating);
          const team2ActualScore = team1Won ? 0 : 1;
          const team2OpponentStrength = this.calculateOpponentStrengthFactor(team2Rating, team1Rating);
          const team2KFactor = 24 * (!team1Won ? marginMultiplier : 1.0) * team2OpponentStrength * (this.matchImportance[matchImportance] || 1.0);
          const team2Result = this.calculateNewRating(team2Rating, team2ExpectedScore, team2ActualScore, team2KFactor);

          teamEloUpdates.push(
            {
              teamId: team1Data.id,
              teamName: team1Data.name || 'Team 1',
              oldRating: team1Rating,
              newRating: team1Result.newRating,
              ratingChange: team1Result.ratingChange,
              won: team1Won,
              expectedScore: team1ExpectedScore,
              opponentRating: team2Rating,
              opponentTeamId: team2Data.id,
              opponentAvgRating: team2Rating,
              kFactor: Math.round(team1KFactor),
              marginMultiplier: team1Won ? marginMultiplier : 1.0,
              matchImportance: matchImportance
            },
            {
              teamId: team2Data.id,
              teamName: team2Data.name || 'Team 2', 
              oldRating: team2Rating,
              newRating: team2Result.newRating,
              ratingChange: team2Result.ratingChange,
              won: !team1Won,
              expectedScore: team2ExpectedScore,
              opponentRating: team1Rating,
              opponentTeamId: team1Data.id,
              opponentAvgRating: team1Rating,
              kFactor: Math.round(team2KFactor),
              marginMultiplier: !team1Won ? marginMultiplier : 1.0,
              matchImportance: matchImportance
            }
          );

          console.log(`✅ Team ELO updates: ${teamEloUpdates.length} teams processed`);
          
        } catch (teamError) {
          console.error('❌ Error processing team ELO:', teamError);
        }
      }

      console.log('🎉 FIFA-style ELO processing completed successfully');
      console.log(`Final result: ${eloUpdates.length} player updates, ${teamEloUpdates.length} team updates`);

      return {
        playerEloUpdates: eloUpdates,
        teamEloUpdates: teamEloUpdates,
        marginMultiplier: marginMultiplier,
        matchImportance: matchImportance
      };
      
    } catch (error) {
      console.error('💥 Critical error in FIFA ELO processing:', error);
      
      // Fallback to standard processing
      return this.processMatchResult(team1Players, team2Players, team1Score, team2Score, team1Data, team2Data);
    }
  }

  /**
   * Preview rating changes before match (useful for UI)
   */
  previewFootballEloChanges(team1Players, team2Players, team1Score, team2Score, matchImportance = 'league') {
    const team1AvgRating = this.calculateTeamAverageRating(team1Players);
    const team2AvgRating = this.calculateTeamAverageRating(team2Players);
    
    const team1Won = team1Score > team2Score;
    const winnerScore = team1Won ? team1Score : team2Score;
    const loserScore = team1Won ? team2Score : team1Score;
    const marginMultiplier = this.calculateMarginMultiplier(winnerScore, loserScore);
    
    const previews = [];
    
    [...team1Players, ...team2Players].forEach(player => {
      const isTeam1 = team1Players.some(p => p.id === player.id);
      const playerWon = isTeam1 ? team1Won : !team1Won;
      const opponentAvgRating = isTeam1 ? team2AvgRating : team1AvgRating;
      
      const currentRating = this.getPlayerEloRating(player);
      const expectedScore = this.calculateExpectedScore(currentRating, opponentAvgRating);
      const opponentStrengthFactor = this.calculateOpponentStrengthFactor(currentRating, opponentAvgRating);
      const enhancedKFactor = this.getEnhancedKFactor(
        player,
        playerWon ? marginMultiplier : 1.0,
        opponentStrengthFactor,
        matchImportance
      );
      
      const ratingChange = Math.round(enhancedKFactor * ((playerWon ? 1 : 0) - expectedScore));
      
      previews.push({
        playerId: player.id,
        playerName: player.name,
        currentRating,
        expectedChange: ratingChange,
        newRating: currentRating + ratingChange,
        marginMultiplier: playerWon ? marginMultiplier : 1.0,
        opponentStrengthFactor: opponentStrengthFactor,
        enhancedKFactor: enhancedKFactor,
        baseKFactor: this.getKFactor(player),
        marginDescription: this.getMarginDescription(team1Score, team2Score)
      });
    });
    
    return {
      previews,
      marginMultiplier,
      marginDescription: this.getMarginDescription(team1Score, team2Score),
      matchImportance
    };
  }

  /**
   * Get human-readable margin description
   */
  getMarginDescription(team1Score, team2Score) {
    const margin = Math.abs(team1Score - team2Score);
    
    if (margin >= 15) return 'Crushing Victory';
    if (margin >= 10) return 'Dominant Win';
    if (margin >= 6) return 'Clear Victory';
    if (margin >= 3) return 'Comfortable Win';
    if (margin >= 2) return 'Close Win';
    return 'Extremely Close';
  }
}

// Create and export the enhanced system
export const footballEloSystem = new FootballEloScalingSystem();

// Demonstration function
export const demonstrateFootballElo = () => {
  console.log('=== FIFA WORLD FOOTBALL ELO DEMONSTRATION ===');
  
  // Mock players with different skill levels
  const players = [
    { id: '1', name: 'Player A', elo_rating: 1600, elo_games_played: 50, skill_level: 'Advanced' },
    { id: '2', name: 'Player B', elo_rating: 1580, elo_games_played: 45, skill_level: 'Advanced' },
    { id: '3', name: 'Player C', elo_rating: 1400, elo_games_played: 30, skill_level: 'Intermediate' },
    { id: '4', name: 'Player D', elo_rating: 1420, elo_games_played: 35, skill_level: 'Intermediate' }
  ];
  
  const team1 = [players[0], players[1]]; // Stronger team
  const team2 = [players[2], players[3]]; // Weaker team
  
  // Test different match scenarios
  const scenarios = [
    { name: 'Close Win vs Weaker', scores: [21, 19], importance: 'league' },
    { name: 'Dominant Win vs Weaker', scores: [21, 8], importance: 'league' },
    { name: 'Championship Close Win', scores: [21, 19], importance: 'championship' },
    { name: 'Championship Dominant Win', scores: [21, 8], importance: 'championship' }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`\n--- ${scenario.name} ---`);
    console.log(`Score: ${scenario.scores[0]}-${scenario.scores[1]}, Importance: ${scenario.importance}`);
    
    const result = footballEloSystem.processFootballEloMatchResult(
      team1, team2, scenario.scores[0], scenario.scores[1], scenario.importance
    );
    
    const playerAChange = result.playerEloUpdates.find(u => u.playerId === '1');
    if (playerAChange) {
      console.log(`${playerAChange.playerName}: ${playerAChange.ratingChange > 0 ? '+' : ''}${playerAChange.ratingChange} ELO`);
      console.log(`  Margin Multiplier: ${playerAChange.marginMultiplier.toFixed(2)}x`);
      console.log(`  Opponent Strength: ${playerAChange.opponentStrengthFactor.toFixed(2)}x`);
      console.log(`  Match Importance: ${playerAChange.matchImportanceMultiplier.toFixed(2)}x`);
      console.log(`  Total K-Factor: ${playerAChange.baseKFactor} → ${playerAChange.kFactor}`);
    }
  });
};

export default FootballEloScalingSystem;