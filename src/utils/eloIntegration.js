// ELO Integration Utilities
// Ensures all match processing uses the selected ELO system

import { eloSystemManager } from '../services/eloSystemManager';

/**
 * Centralized ELO processing function that uses the currently selected system
 * This ensures all match processing respects the user's ELO system choice
 */
export const processMatchWithSelectedSystem = (team1Players, team2Players, team1Score, team2Score, team1Data = null, team2Data = null, matchImportance = 'league') => {
  console.log(`🎯 Processing match with selected ELO system: ${eloSystemManager.getCurrentSystemName()}`);
  
  try {
    // Use the system manager to process with the currently selected system
    const result = eloSystemManager.processMatch(
      team1Players,
      team2Players,
      team1Score,
      team2Score,
      team1Data,
      team2Data,
      matchImportance
    );
    
    // Add system information to the result for tracking
    return {
      ...result,
      eloSystemUsed: eloSystemManager.getCurrentSystemName(),
      marginScalingUsed: result.marginScalingUsed || false,
      marginMultiplier: result.marginMultiplier || 1.0
    };
    
  } catch (error) {
    console.error('❌ Error in selected ELO system processing:', error);
    
    // Fallback to standard system if selected system fails
    console.log('🔄 Falling back to standard ELO system...');
    eloSystemManager.setSystem('standard');
    
    return eloSystemManager.processMatch(
      team1Players,
      team2Players,
      team1Score,
      team2Score,
      team1Data,
      team2Data,
      matchImportance
    );
  }
};

/**
 * Helper to show which ELO system is currently active
 */
export const getCurrentEloSystemInfo = () => {
  const systemName = eloSystemManager.getCurrentSystemName();
  const descriptions = eloSystemManager.getSystemDescriptions();
  
  return {
    name: systemName,
    displayName: descriptions[systemName]?.name || systemName,
    description: descriptions[systemName]?.description || 'Unknown system',
    marginSupport: descriptions[systemName]?.marginSupport || false
  };
};

/**
 * Integration patch for existing services
 * This allows gradual migration to the new system
 */
export const patchExistingServices = () => {
  // Store original functions
  const originalBadmintonEloProcess = window.badmintonEloSystem?.processMatchResult;
  
  if (originalBadmintonEloProcess) {
    // Monkey patch the badminton ELO system to use the selected system
    window.badmintonEloSystem.processMatchResult = function(team1Players, team2Players, team1Score, team2Score, team1Data, team2Data) {
      console.log('🔧 Intercepted badmintonEloSystem.processMatchResult - redirecting to selected system');
      return processMatchWithSelectedSystem(team1Players, team2Players, team1Score, team2Score, team1Data, team2Data);
    };
    
    console.log('✅ Patched badmintonEloSystem to use selected ELO system');
  }
};

/**
 * Initialize ELO system integration
 * Call this when the app starts
 */
export const initializeEloIntegration = () => {
  console.log('🚀 Initializing ELO system integration...');
  
  // Apply patches
  patchExistingServices();
  
  // Show current system
  const systemInfo = getCurrentEloSystemInfo();
  console.log(`📊 Active ELO system: ${systemInfo.displayName}`);
  console.log(`   Description: ${systemInfo.description}`);
  console.log(`   Margin support: ${systemInfo.marginSupport ? '✅' : '❌'}`);
  
  // Make system info available globally for debugging
  if (typeof window !== 'undefined') {
    window.currentEloSystemInfo = getCurrentEloSystemInfo;
    window.processMatchWithSelectedSystem = processMatchWithSelectedSystem;
  }
  
  return systemInfo;
};

export default {
  processMatchWithSelectedSystem,
  getCurrentEloSystemInfo,
  initializeEloIntegration,
  patchExistingServices
};