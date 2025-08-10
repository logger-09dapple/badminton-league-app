// ELO System Demonstration Utilities
import { eloSystemManager } from '../services/eloSystemManager';

/**
 * Demonstrate the impact of different ELO systems on match results
 */
export const demonstrateEloSystemImpact = (team1Score = 21, team2Score = 8) => {
  console.log('\n🎯 ELO SYSTEM IMPACT DEMONSTRATION');
  console.log(`Match Score: ${team1Score} - ${team2Score} (${Math.abs(team1Score - team2Score)} point margin)`);
  console.log('=====================================');

  // Mock evenly matched players
  const team1Players = [
    { id: '1', name: 'Player A', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' },
    { id: '2', name: 'Player B', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' }
  ];
  
  const team2Players = [
    { id: '3', name: 'Player C', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' },
    { id: '4', name: 'Player D', elo_rating: 1500, elo_games_played: 50, skill_level: 'Intermediate' }
  ];

  const systems = ['standard', 'fifa', 'conservative', 'aggressive'];
  const results = {};

  // Test each system
  systems.forEach(systemName => {
    console.log(`\n--- ${systemName.toUpperCase()} SYSTEM ---`);
    
    try {
      // Set the system
      eloSystemManager.setSystem(systemName);
      
      // Process the match
      const result = eloSystemManager.processMatch(
        team1Players, 
        team2Players, 
        team1Score, 
        team2Score
      );
      
      // Get the first player's result (winner)
      const player1Result = result.playerEloUpdates?.find(u => u.playerId === '1');
      
      if (player1Result) {
        console.log(`${player1Result.playerName}: ${player1Result.ratingChange > 0 ? '+' : ''}${player1Result.ratingChange} ELO`);
        console.log(`  New Rating: ${player1Result.oldRating} → ${player1Result.newRating}`);
        
        if (player1Result.marginMultiplier && player1Result.marginMultiplier !== 1.0) {
          console.log(`  Margin Multiplier: ${player1Result.marginMultiplier.toFixed(3)}x`);
        }
        
        if (player1Result.baseKFactor && player1Result.kFactor !== player1Result.baseKFactor) {
          console.log(`  K-Factor: ${player1Result.baseKFactor} → ${player1Result.kFactor}`);
        }
        
        results[systemName] = {
          ratingChange: player1Result.ratingChange,
          newRating: player1Result.newRating,
          marginMultiplier: player1Result.marginMultiplier || 1.0,
          kFactor: player1Result.kFactor || player1Result.baseKFactor
        };
      }
    } catch (error) {
      console.error(`❌ Error with ${systemName}: ${error.message}`);
      results[systemName] = { error: error.message };
    }
  });

  // Summary comparison
  console.log('\n📊 SUMMARY COMPARISON');
  console.log('=====================');
  
  const standardChange = results.standard?.ratingChange || 0;
  
  Object.entries(results).forEach(([systemName, result]) => {
    if (!result.error) {
      const bonus = result.ratingChange - standardChange;
      const bonusText = bonus !== 0 ? ` (${bonus > 0 ? '+' : ''}${bonus} bonus)` : '';
      
      console.log(`${systemName.padEnd(12)}: ${result.ratingChange > 0 ? '+' : ''}${result.ratingChange} ELO${bonusText}`);
      
      if (result.marginMultiplier > 1) {
        console.log(`${' '.repeat(14)}Margin Factor: ${result.marginMultiplier.toFixed(2)}x`);
      }
    }
  });

  // Restore original system
  eloSystemManager.setSystem('standard');
  
  return results;
};

/**
 * Compare margin scaling across different score scenarios
 */
export const compareMarginScaling = () => {
  console.log('\n🔍 MARGIN SCALING COMPARISON');
  console.log('============================');

  const scenarios = [
    { name: 'Extremely Close', scores: [22, 20] },
    { name: 'Close Win', scores: [21, 19] },
    { name: 'Comfortable Win', scores: [21, 15] },
    { name: 'Clear Victory', scores: [21, 11] },
    { name: 'Dominant Win', scores: [21, 7] },
    { name: 'Crushing Victory', scores: [21, 3] }
  ];

  const marginSystems = ['standard', 'fifa', 'conservative', 'aggressive'];
  
  scenarios.forEach(scenario => {
    console.log(`\n${scenario.name} (${scenario.scores[0]}-${scenario.scores[1]}):`);
    
    const standardResult = demonstrateEloSystemImpact(scenario.scores[0], scenario.scores[1]);
    
    marginSystems.forEach(systemName => {
      const result = standardResult[systemName];
      if (result && !result.error) {
        const multiplierText = result.marginMultiplier > 1 
          ? ` (${result.marginMultiplier.toFixed(2)}x)` 
          : '';
        console.log(`  ${systemName.padEnd(12)}: ${result.ratingChange > 0 ? '+' : ''}${result.ratingChange}${multiplierText}`);
      }
    });
  });
};

/**
 * Show the mathematical progression of margin scaling
 */
export const showMarginMath = () => {
  console.log('\n🧮 MARGIN SCALING MATHEMATICS');
  console.log('==============================');
  
  console.log('FIFA System Formula: Multiplier = 1 + 0.15 × ln(1 + effective_margin)');
  console.log('Where effective_margin = max(0, actual_margin - 2)\n');
  
  for (let margin = 1; margin <= 20; margin++) {
    const effectiveMargin = Math.max(0, margin - 2);
    const multiplier = 1 + (0.15 * Math.log(1 + effectiveMargin));
    const clampedMultiplier = Math.max(1.0, Math.min(1.75, multiplier));
    
    console.log(`${margin.toString().padStart(2)} point margin: ${clampedMultiplier.toFixed(3)}x multiplier`);
  }
};

/**
 * Test setup processing with different ELO systems
 */
export const testSetupWithEloSystems = async () => {
  console.log('\n🔧 TESTING SETUP WITH DIFFERENT ELO SYSTEMS');
  console.log('=============================================');
  
  const systems = ['standard', 'fifa', 'conservative', 'aggressive'];
  
  systems.forEach(systemName => {
    console.log(`\n--- Setup with ${systemName.toUpperCase()} system ---`);
    eloSystemManager.setSystem(systemName);
    
    const currentSystem = eloSystemManager.getCurrentSystem();
    const systemDesc = eloSystemManager.getSystemDescriptions()[systemName];
    
    console.log(`✅ System active: ${systemDesc.name}`);
    console.log(`   Description: ${systemDesc.description}`);
    console.log(`   Margin support: ${systemDesc.marginSupport ? 'Yes' : 'No'}`);
    
    if (systemDesc.marginSupport) {
      console.log('   ⚠️ Setup processing will use margin scaling');
      console.log('   📊 Larger victories will receive ELO bonuses');
    } else {
      console.log('   📊 Setup processing will use binary win/loss');
    }
  });
  
  // Restore standard system
  eloSystemManager.setSystem('standard');
  
  console.log('\n💡 RECOMMENDATION FOR SETUP:');
  console.log('- Use "fifa" system for professional-grade ratings');
  console.log('- Use "conservative" for gentle margin consideration'); 
  console.log('- Use "standard" for traditional ELO behavior');
  console.log('- Run setup AFTER selecting your preferred system');
};

// Make functions available in browser console
if (typeof window !== 'undefined') {
  window.demonstrateEloSystemImpact = demonstrateEloSystemImpact;
  window.compareMarginScaling = compareMarginScaling;
  window.showMarginMath = showMarginMath;
  window.testSetupWithEloSystems = testSetupWithEloSystems;
}

export default {
  demonstrateEloSystemImpact,
  compareMarginScaling,
  showMarginMath,
  testSetupWithEloSystems
};