// ELO System Manager - Easily switch between different ELO implementations
import { badmintonEloSystem, BadmintonEloSystem } from '../utils/BadmintonEloSystem';
import { FootballEloScalingSystem, footballEloSystem } from '../utils/FootballEloScalingSystem';

/**
 * ELO System Manager
 * Provides easy switching between different ELO calculation methods
 */
export class EloSystemManager {
  constructor() {
    this.systems = {
      // Standard binary ELO (current default)
      standard: new BadmintonEloSystem({
        useMarginScaling: false
      }),
      
      // FIFA World Football style with logarithmic margin scaling
      fifa: new FootballEloScalingSystem({
        marginScaling: {
          logBase: Math.E,
          scaleFactor: 0.15,
          maxMultiplier: 1.75,
          minMultiplier: 1.0,
          baselineMargin: 2
        }
      }),
      
      // Conservative margin scaling (smaller impact)
      conservative: new BadmintonEloSystem({
        useMarginScaling: true,
        marginScaling: {
          type: 'logarithmic',
          scaleFactor: 0.08,
          maxMultiplier: 1.4,
          minMultiplier: 1.0,
          baselineMargin: 3
        }
      }),
      
      // Aggressive margin scaling (bigger impact)
      aggressive: new BadmintonEloSystem({
        useMarginScaling: true,
        marginScaling: {
          type: 'logarithmic',
          scaleFactor: 0.25,
          maxMultiplier: 2.0,
          minMultiplier: 1.0,
          baselineMargin: 1
        }
      }),
      
      // Linear margin scaling (constant per-point impact)
      linear: new BadmintonEloSystem({
        useMarginScaling: true,
        marginScaling: {
          type: 'linear',
          scaleFactor: 0.05,
          maxMultiplier: 1.6,
          minMultiplier: 1.0,
          baselineMargin: 2
        }
      })
    };
    
    // Current active system
    this.currentSystem = 'standard';
  }

  /**
   * Set the active ELO system
   */
  setSystem(systemName) {
    if (this.systems[systemName]) {
      this.currentSystem = systemName;
      console.log(`🎯 ELO System switched to: ${systemName}`);
      return true;
    } else {
      console.error(`❌ Unknown ELO system: ${systemName}`);
      return false;
    }
  }

  /**
   * Get the current active system
   */
  getCurrentSystem() {
    return this.systems[this.currentSystem];
  }

  /**
   * Process match with current system
   */
  processMatch(team1Players, team2Players, team1Score, team2Score, team1Data = null, team2Data = null, matchImportance = 'league') {
    const system = this.getCurrentSystem();
    
    // Use FIFA-specific method if available
    if (this.currentSystem === 'fifa' && system.processFootballEloMatchResult) {
      return system.processFootballEloMatchResult(
        team1Players, 
        team2Players, 
        team1Score, 
        team2Score, 
        matchImportance,
        team1Data, 
        team2Data
      );
    }
    
    // Use standard method for all other systems
    return system.processMatchResult(
      team1Players, 
      team2Players, 
      team1Score, 
      team2Score, 
      team1Data, 
      team2Data
    );
  }

  /**
   * Compare all systems side-by-side for a given match
   */
  compareAllSystems(team1Players, team2Players, team1Score, team2Score) {
    console.log('\n=== ELO SYSTEM COMPARISON ===');
    console.log(`Match: ${team1Score}-${team2Score} (Margin: ${Math.abs(team1Score - team2Score)})`);
    
    const results = {};
    
    Object.keys(this.systems).forEach(systemName => {
      try {
        console.log(`\n--- ${systemName.toUpperCase()} SYSTEM ---`);
        
        const system = this.systems[systemName];
        let result;
        
        if (systemName === 'fifa') {
          result = system.processFootballEloMatchResult(
            team1Players, team2Players, team1Score, team2Score, 'league'
          );
        } else {
          result = system.processMatchResult(
            team1Players, team2Players, team1Score, team2Score
          );
        }
        
        const player1Update = result.playerEloUpdates?.find(u => u.playerId === team1Players[0]?.id);
        const player2Update = result.playerEloUpdates?.find(u => u.playerId === team1Players[1]?.id);
        
        if (player1Update && player2Update) {
          console.log(`${player1Update.playerName}: ${player1Update.ratingChange > 0 ? '+' : ''}${player1Update.ratingChange} ELO`);
          console.log(`${player2Update.playerName}: ${player2Update.ratingChange > 0 ? '+' : ''}${player2Update.ratingChange} ELO`);
          
          if (player1Update.marginMultiplier && player1Update.marginMultiplier !== 1.0) {
            console.log(`Margin Multiplier: ${player1Update.marginMultiplier.toFixed(3)}x`);
          }
          
          results[systemName] = {
            player1Change: player1Update.ratingChange,
            player2Change: player2Update.ratingChange,
            marginMultiplier: player1Update.marginMultiplier || 1.0,
            system: systemName
          };
        }
        
      } catch (error) {
        console.log(`Error with ${systemName}: ${error.message}`);
        results[systemName] = { error: error.message };
      }
    });
    
    // Summary comparison
    console.log('\n=== SUMMARY COMPARISON ===');
    console.log('Player 1 ELO Changes:');
    Object.entries(results).forEach(([name, result]) => {
      if (!result.error) {
        console.log(`  ${name}: ${result.player1Change > 0 ? '+' : ''}${result.player1Change} ${result.marginMultiplier > 1 ? `(${result.marginMultiplier.toFixed(2)}x margin)` : ''}`);
      }
    });
    
    return results;
  }

  /**
   * Get system descriptions for UI
   */
  getSystemDescriptions() {
    return {
      standard: {
        name: 'Standard ELO',
        description: 'Traditional binary win/loss ELO rating system',
        marginSupport: false,
        bestFor: 'Simple, predictable ratings'
      },
      fifa: {
        name: 'FIFA World Football Style',
        description: 'Logarithmic margin scaling used in international football rankings',
        marginSupport: true,
        bestFor: 'Professional-grade ratings with margin consideration'
      },
      conservative: {
        name: 'Conservative Margin',
        description: 'Gentle margin scaling - small bonuses for decisive wins',
        marginSupport: true,
        bestFor: 'Balanced ratings with modest margin rewards'
      },
      aggressive: {
        name: 'Aggressive Margin',
        description: 'Strong margin scaling - big bonuses for dominant victories',
        marginSupport: true,
        bestFor: 'Emphasizing skill differences and dominance'
      },
      linear: {
        name: 'Linear Margin',
        description: 'Constant per-point bonus for margin of victory',
        marginSupport: true,
        bestFor: 'Predictable, proportional margin rewards'
      }
    };
  }

  /**
   * Demonstrate margin scaling effects
   */
  demonstrateMarginEffects() {
    console.log('\n=== MARGIN SCALING DEMONSTRATION ===');
    
    // Mock evenly matched players
    const team1 = [
      { id: '1', name: 'Player A', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' },
      { id: '2', name: 'Player B', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' }
    ];
    const team2 = [
      { id: '3', name: 'Player C', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' },
      { id: '4', name: 'Player D', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' }
    ];
    
    // Test different score margins
    const scenarios = [
      { name: 'Extremely Close', score: [22, 20] },
      { name: 'Close Win', score: [21, 19] },
      { name: 'Comfortable Win', score: [21, 16] },
      { name: 'Clear Victory', score: [21, 12] },
      { name: 'Dominant Win', score: [21, 8] },
      { name: 'Crushing Victory', score: [21, 3] }
    ];
    
    scenarios.forEach(scenario => {
      console.log(`\n${scenario.name} (${scenario.score[0]}-${scenario.score[1]}):`);
      
      // Compare standard vs FIFA system
      const standardResult = this.systems.standard.processMatchResult(team1, team2, scenario.score[0], scenario.score[1]);
      const fifaResult = this.systems.fifa.processFootballEloMatchResult(team1, team2, scenario.score[0], scenario.score[1], 'league');
      
      const standardChange = standardResult.playerEloUpdates[0]?.ratingChange || 0;
      const fifaChange = fifaResult.playerEloUpdates[0]?.ratingChange || 0;
      const marginMultiplier = fifaResult.playerEloUpdates[0]?.marginMultiplier || 1.0;
      
      console.log(`  Standard ELO: ${standardChange > 0 ? '+' : ''}${standardChange}`);
      console.log(`  FIFA ELO: ${fifaChange > 0 ? '+' : ''}${fifaChange} (${marginMultiplier.toFixed(2)}x margin)`);
      console.log(`  Difference: ${Math.abs(fifaChange - standardChange)} points more reward for margin`);
    });
  }

  /**
   * Get available systems list
   */
  getAvailableSystems() {
    return Object.keys(this.systems);
  }

  /**
   * Get current system name
   */
  getCurrentSystemName() {
    return this.currentSystem;
  }
}

// Create singleton instance
export const eloSystemManager = new EloSystemManager();

// Make available for console testing
if (typeof window !== 'undefined') {
  window.eloSystemManager = eloSystemManager;
  window.demonstrateEloSystems = () => eloSystemManager.demonstrateMarginEffects();
  window.compareEloSystems = (team1Score = 21, team2Score = 8) => {
    const mockTeam1 = [
      { id: '1', name: 'Player A', elo_rating: 1600, elo_games_played: 50 },
      { id: '2', name: 'Player B', elo_rating: 1580, elo_games_played: 45 }
    ];
    const mockTeam2 = [
      { id: '3', name: 'Player C', elo_rating: 1500, elo_games_played: 40 },
      { id: '4', name: 'Player D', elo_rating: 1520, elo_games_played: 35 }
    ];
    return eloSystemManager.compareAllSystems(mockTeam1, mockTeam2, team1Score, team2Score);
  };
}

export default eloSystemManager;