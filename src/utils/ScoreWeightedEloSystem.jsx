// Enhanced ELO System that considers score margins
import { BadmintonEloSystem } from './BadmintonEloSystem';

export class ScoreWeightedEloSystem extends BadmintonEloSystem {
  
  /**
   * Calculate score-weighted actual score instead of binary win/loss
   * This makes ELO changes reflect the margin of victory
   */
  calculateScoreWeightedActualScore(team1Score, team2Score, isTeam1Player) {
    try {
      const playerTeamScore = isTeam1Player ? team1Score : team2Score;
      const opponentTeamScore = isTeam1Player ? team2Score : team1Score;
      
      // Basic win/loss (0.0 to 1.0)
      const playerWon = playerTeamScore > opponentTeamScore;
      let baseScore = playerWon ? 1 : 0;
      
      // Calculate score margin factor
      const totalPoints = team1Score + team2Score;
      const scoreDifference = Math.abs(team1Score - team2Score);
      
      // Margin factor: ranges from 0.5 (close) to 1.5 (dominant)
      let marginFactor = 1.0;
      
      if (totalPoints > 0) {
        // Normalize score difference (0 to 1, where 1 is maximum possible difference)
        const maxPossibleDiff = Math.max(team1Score, team2Score); // Winner's score is max possible in this context
        const normalizedDiff = Math.min(1.0, scoreDifference / maxPossibleDiff);
        
        // Convert to margin factor: 0.5x to 1.5x multiplier
        marginFactor = 0.5 + normalizedDiff;
      }
      
      // Apply margin factor
      if (playerWon) {
        // Winner gets bonus for dominant performance
        baseScore = Math.min(1.5, baseScore * marginFactor);
      } else {
        // Loser gets less penalty for close loss
        baseScore = Math.max(-0.5, baseScore - (1 - marginFactor));
      }
      
      return {
        actualScore: baseScore,
        marginFactor: marginFactor,
        scoreDifference: scoreDifference,
        wasClose: scoreDifference <= 3, // 21-19 or closer
        wasDominant: scoreDifference >= 10 // 21-11 or more
      };
      
    } catch (error) {
      console.error('Error calculating score-weighted actual score:', error);
      // Fallback to binary win/loss
      const playerWon = isTeam1Player ? team1Score > team2Score : team2Score > team1Score;
      return {
        actualScore: playerWon ? 1 : 0,
        marginFactor: 1.0,
        scoreDifference: Math.abs(team1Score - team2Score),
        wasClose: false,
        wasDominant: false
      };
    }
  }
  
  /**
   * Enhanced match processing with score-weighted calculations
   */
  processMatchResultWithScoreWeight(team1Players, team2Players, team1Score, team2Score, team1Data = null, team2Data = null) {
    try {
      console.log(`Processing score-weighted match: Team 1: ${team1Score}, Team 2: ${team2Score}`);
      
      // Validate inputs (reuse parent validation)
      const team1Validation = this.validatePlayerData(team1Players);
      if (!team1Validation.isValid) {
        throw new Error(`Team 1 validation failed: ${team1Validation.errors.join(', ')}`);
      }
      
      const team2Validation = this.validatePlayerData(team2Players);
      if (!team2Validation.isValid) {
        throw new Error(`Team 2 validation failed: ${team2Validation.errors.join(', ')}`);
      }
      
      const scoreValidation = this.validateMatchScores(team1Score, team2Score);
      if (!scoreValidation.isValid) {
        throw new Error(`Score validation failed: ${scoreValidation.errors.join(', ')}`);
      }
      
      // Calculate team averages
      const team1AvgRating = this.calculateTeamAverageRating(team1Players);
      const team2AvgRating = this.calculateTeamAverageRating(team2Players);
      
      const eloUpdates = [];
      const allPlayers = [...team1Players, ...team2Players];
      
      // Process each player with score-weighted calculations
      for (let i = 0; i < allPlayers.length; i++) {
        const player = allPlayers[i];
        try {
          if (!player || !player.id) {
            console.warn(`Skipping invalid player at index ${i}`);
            continue;
          }
          
          const isTeam1 = team1Players.some(p => p.id === player.id);
          const opponentAvgRating = isTeam1 ? team2AvgRating : team1AvgRating;
          
          const currentRating = this.getPlayerEloRating(player);
          const expectedScore = this.calculateExpectedScore(currentRating, opponentAvgRating);
          
          // Use score-weighted actual score instead of binary win/loss
          const scoreWeightedResult = this.calculateScoreWeightedActualScore(team1Score, team2Score, isTeam1);
          const actualScore = Math.max(0, Math.min(1, scoreWeightedResult.actualScore));
          
          const kFactor = this.getKFactor(player);
          const ratingResult = this.calculateNewRating(currentRating, expectedScore, actualScore, kFactor);
          const newSkillLevel = this.getSkillLevelFromElo(ratingResult.newRating);
          
          eloUpdates.push({
            playerId: player.id,
            playerName: player.name || 'Unknown',
            oldRating: currentRating,
            newRating: ratingResult.newRating,
            ratingChange: ratingResult.ratingChange,
            oldSkillLevel: player.skill_level || this.getSkillLevelFromElo(currentRating),
            newSkillLevel: newSkillLevel,
            expectedScore: ratingResult.expectedScore,
            actualScore: actualScore,
            kFactor: ratingResult.kFactor,
            opponentAvgRating,
            won: scoreWeightedResult.actualScore > 0.5,
            // Additional score-weighted info
            marginFactor: scoreWeightedResult.marginFactor,
            scoreDifference: scoreWeightedResult.scoreDifference,
            wasClose: scoreWeightedResult.wasClose,
            wasDominant: scoreWeightedResult.wasDominant,
            gameScore: `${team1Score}-${team2Score}`
          });
          
        } catch (playerError) {
          console.error(`Error processing player ${player?.name || player?.id || 'unknown'}:`, playerError);
          // Fallback to basic calculation
          const basicResult = this.processMatchResult([player], [], 1, 0);
          if (basicResult.playerEloUpdates.length > 0) {
            eloUpdates.push({
              ...basicResult.playerEloUpdates[0],
              error: playerError.message
            });
          }
        }
      }
      
      console.log(`Score-weighted ELO processing completed: ${eloUpdates.length} player updates`);
      
      return {
        playerEloUpdates: eloUpdates,
        teamEloUpdates: [] // Team ELO could also be enhanced similarly
      };
      
    } catch (error) {
      console.error('Critical error in score-weighted ELO processing:', error);
      // Fallback to standard processing
      return this.processMatchResult(team1Players, team2Players, team1Score, team2Score, team1Data, team2Data);
    }
  }
}

// Example usage and comparison
export const scoreWeightedEloSystem = new ScoreWeightedEloSystem();

// Demonstration function to show the difference
export const demonstrateScoreDifference = (player1Rating = 1600, player2Rating = 1500) => {
  const system = new ScoreWeightedEloSystem();
  
  console.log('=== ELO COMPARISON: 21-2 vs 21-19 ===');
  
  // Mock players
  const player1 = { id: '1', name: 'Player 1', elo_rating: player1Rating, elo_games_played: 50 };
  const player2 = { id: '2', name: 'Player 2', elo_rating: player2Rating, elo_games_played: 50 };
  
  // Test both scenarios
  const scenarios = [
    { team1Score: 21, team2Score: 2, description: 'Dominant Win (21-2)' },
    { team1Score: 21, team2Score: 19, description: 'Close Win (21-19)' },
    { team1Score: 19, team2Score: 21, description: 'Close Loss (19-21)' },
    { team1Score: 2, team2Score: 21, description: 'Dominant Loss (2-21)' }
  ];
  
  scenarios.forEach(scenario => {
    console.log(`\n--- ${scenario.description} ---`);
    
    // Current system (binary)
    const binaryResult = system.processMatchResult([player1], [player2], scenario.team1Score, scenario.team2Score);
    const binaryChange = binaryResult.playerEloUpdates[0]?.ratingChange || 0;
    
    // New system (score-weighted)
    const weightedResult = system.processMatchResultWithScoreWeight([player1], [player2], scenario.team1Score, scenario.team2Score);
    const weightedChange = weightedResult.playerEloUpdates[0]?.ratingChange || 0;
    const marginFactor = weightedResult.playerEloUpdates[0]?.marginFactor || 1;
    
    console.log(`Binary ELO change: ${binaryChange > 0 ? '+' : ''}${binaryChange}`);
    console.log(`Weighted ELO change: ${weightedChange > 0 ? '+' : ''}${weightedChange}`);
    console.log(`Margin factor: ${marginFactor.toFixed(2)}x`);
    console.log(`Difference: ${Math.abs(weightedChange - binaryChange)} ELO points`);
  });
};

export default ScoreWeightedEloSystem;